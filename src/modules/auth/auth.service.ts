import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { hashPassword, verifyPassword, generateRandomToken, hashToken } from '../../utils/crypto';
import { generateAccessToken } from '../../utils/jwt';
import { emailService } from '../../services/email.service';
import { authRepository, UserRecord } from './auth.repository';

export class AuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(env.googleClientId || undefined);
  }

  async register(params: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();

    const existingUser = await authRepository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw { status: 409, message: 'An account with this email already exists.' };
    }

    const passwordHash = await hashPassword(params.password);
    const rawVerificationToken = generateRandomToken(32);
    const verificationTokenHash = hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { user } = await authRepository.createUserWithEmail(
      {
        email: normalizedEmail,
        passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
      },
      verificationTokenHash,
      expiresAt
    );

    // Send verification email
    await emailService.sendVerificationEmail(normalizedEmail, rawVerificationToken);

    return {
      message: 'Registration successful. Please verify your email address.',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        onboardingCompleted: user.onboarding_completed,
        createdAt: user.created_at,
      },
    };
  }

  async login(params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
    deviceName?: string;
    deviceType?: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const user = await authRepository.findUserByEmail(normalizedEmail);

    if (!user || !user.password_hash) {
      await authRepository.logLoginAttempt({
        email: normalizedEmail,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        successful: false,
        failureReason: 'Invalid credentials',
      });
      throw { status: 401, message: 'Invalid email or password.' };
    }

    const isValid = await verifyPassword(params.password, user.password_hash);
    if (!isValid) {
      await authRepository.logLoginAttempt({
        email: normalizedEmail,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        successful: false,
        failureReason: 'Invalid password',
      });
      throw { status: 401, message: 'Invalid email or password.' };
    }

    if (user.status === 'suspended') {
      await authRepository.logLoginAttempt({
        email: normalizedEmail,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        successful: false,
        failureReason: 'Account suspended',
      });
      throw { status: 403, message: 'Your account has been suspended. Please contact support.' };
    }

    if (user.status === 'deleted' || user.deleted_at) {
      await authRepository.logLoginAttempt({
        email: normalizedEmail,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        successful: false,
        failureReason: 'Account deleted',
      });
      throw { status: 403, message: 'This account has been deleted.' };
    }

    // Generate tokens & session
    const rawRefreshToken = generateRandomToken(32);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000);

    const session = await authRepository.createSession({
      userId: user.id,
      refreshTokenHash,
      deviceName: params.deviceName,
      deviceType: params.deviceType,
      ipAddress: params.ipAddress,
      expiresAt,
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      sessionId: session.id,
    });

    await authRepository.logLoginAttempt({
      email: normalizedEmail,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      successful: true,
    });

    await authRepository.logSecurityEvent({
      userId: user.id,
      eventType: 'LOGIN_SUCCESS',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { sessionId: session.id },
    });

    const profileData = await authRepository.getUserWithProfile(user.id);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        onboardingCompleted: user.onboarding_completed,
        emailVerifiedAt: user.email_verified_at,
        displayName: profileData?.display_name,
        profilePhotoUrl: profileData?.profile_photo_url,
      },
    };
  }

  async googleSignIn(params: {
    idToken: string;
    ipAddress?: string;
    userAgent?: string;
    deviceName?: string;
    deviceType?: string;
  }) {
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: params.idToken,
        audience: env.googleClientId || undefined,
      });
      payload = ticket.getPayload();
    } catch (err: any) {
      throw { status: 401, message: `Invalid Google ID token: ${err.message}` };
    }

    if (!payload || !payload.sub || !payload.email) {
      throw { status: 401, message: 'Google token does not contain required user identity.' };
    }

    const googleId = payload.sub;
    const normalizedEmail = payload.email.trim().toLowerCase();

    let user: UserRecord | null = null;
    const existingAuthAccount = await authRepository.findAuthAccount('google', googleId);

    if (existingAuthAccount) {
      user = await authRepository.findUserById(existingAuthAccount.user_id);
    } else {
      // Check if user with this email already exists
      const existingUser = await authRepository.findUserByEmail(normalizedEmail);
      if (existingUser) {
        // Link google account to existing user
        await authRepository.linkGoogleAccount(existingUser.id, googleId, normalizedEmail);
        user = existingUser;
      } else {
        // Create new user and profile
        user = await authRepository.createUserWithGoogle({
          googleId,
          email: normalizedEmail,
          firstName: payload.given_name,
          lastName: payload.family_name,
          displayName: payload.name,
          pictureUrl: payload.picture,
        });
      }
    }

    if (!user) {
      throw { status: 500, message: 'Failed to authenticate user.' };
    }

    if (user.status === 'suspended') {
      throw { status: 403, message: 'Your account has been suspended. Please contact support.' };
    }

    if (user.status === 'deleted' || user.deleted_at) {
      throw { status: 403, message: 'This account has been deleted.' };
    }

    // Create session & tokens
    const rawRefreshToken = generateRandomToken(32);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000);

    const session = await authRepository.createSession({
      userId: user.id,
      refreshTokenHash,
      deviceName: params.deviceName,
      deviceType: params.deviceType,
      ipAddress: params.ipAddress,
      expiresAt,
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      sessionId: session.id,
    });

    await authRepository.logSecurityEvent({
      userId: user.id,
      eventType: 'GOOGLE_LOGIN_SUCCESS',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { sessionId: session.id },
    });

    const profileData = await authRepository.getUserWithProfile(user.id);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        onboardingCompleted: user.onboarding_completed,
        emailVerifiedAt: user.email_verified_at,
        displayName: profileData?.display_name,
        profilePhotoUrl: profileData?.profile_photo_url,
      },
    };
  }

  async refreshToken(rawRefreshToken: string, ipAddress?: string) {
    if (!rawRefreshToken) {
      throw { status: 400, message: 'Refresh token is required.' };
    }

    const tokenHash = hashToken(rawRefreshToken);
    const session = await authRepository.findActiveSessionByTokenHash(tokenHash);

    if (!session) {
      throw { status: 401, message: 'Invalid, expired, or revoked refresh token.' };
    }

    const user = await authRepository.findUserById(session.user_id);
    if (!user || user.status !== 'active' || user.deleted_at) {
      throw { status: 401, message: 'Account is inactive or no longer exists.' };
    }

    // Refresh token rotation: revoke current session and issue a new one
    await authRepository.revokeSession(session.id);

    const newRawRefreshToken = generateRandomToken(32);
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000);

    const newSession = await authRepository.createSession({
      userId: user.id,
      refreshTokenHash: newRefreshTokenHash,
      deviceName: session.device_name || undefined,
      deviceType: session.device_type || undefined,
      ipAddress: ipAddress || (session.last_ip as any) || undefined,
      expiresAt,
    });

    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      sessionId: newSession.id,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(sessionId?: string, rawRefreshToken?: string) {
    if (sessionId) {
      await authRepository.revokeSession(sessionId);
    } else if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      const session = await authRepository.findActiveSessionByTokenHash(tokenHash);
      if (session) {
        await authRepository.revokeSession(session.id);
      }
    }
    return { message: 'Logged out successfully.' };
  }

  async logoutFromAllDevices(userId: string) {
    const revokedCount = await authRepository.revokeAllUserSessions(userId);
    await authRepository.logSecurityEvent({
      userId,
      eventType: 'ALL_SESSIONS_REVOKED',
      metadata: { revokedCount },
    });
    return { message: 'All active sessions have been revoked successfully.' };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const tokenRecord = await authRepository.findVerificationToken(tokenHash);

    if (!tokenRecord) {
      throw { status: 400, message: 'Invalid, used, or expired verification token.' };
    }

    await authRepository.markEmailAsVerified(tokenRecord.user_id, tokenRecord.id);

    return { message: 'Email verified successfully. You may now log in.' };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await authRepository.findUserByEmail(normalizedEmail);

    // Avoid revealing whether email is registered
    if (user && user.status === 'active') {
      const rawToken = generateRandomToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await authRepository.createPasswordResetToken(user.id, tokenHash, expiresAt);
      await emailService.sendPasswordResetEmail(normalizedEmail, rawToken);

      await authRepository.logSecurityEvent({
        userId: user.id,
        eventType: 'PASSWORD_RESET_REQUESTED',
      });
    }

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(params: { token: string; newPassword: string }) {
    const tokenHash = hashToken(params.token);
    const tokenRecord = await authRepository.findPasswordResetToken(tokenHash);

    if (!tokenRecord) {
      throw { status: 400, message: 'Invalid, used, or expired password reset token.' };
    }

    const passwordHash = await hashPassword(params.newPassword);
    await authRepository.resetPassword(tokenRecord.user_id, tokenRecord.id, passwordHash);

    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }

  async updatePassword(userId: string, params: { currentPassword: string; newPassword: string }) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw { status: 404, message: 'User not found.' };
    }

    if (!user.password_hash) {
      throw {
        status: 400,
        message: 'This account was created via social login and does not have a password set.',
      };
    }

    const isValid = await verifyPassword(params.currentPassword, user.password_hash);
    if (!isValid) {
      throw { status: 400, message: 'Incorrect current password.' };
    }

    const newPasswordHash = await hashPassword(params.newPassword);
    await authRepository.updatePassword(userId, newPasswordHash);

    return { message: 'Password updated successfully.' };
  }

  async getCurrentUser(userId: string) {
    const user = await authRepository.getUserWithProfile(userId);
    if (!user) {
      throw { status: 404, message: 'User not found.' };
    }

    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.email_verified_at,
      status: user.status,
      onboardingCompleted: user.onboarding_completed,
      createdAt: user.created_at,
      profile: {
        firstName: user.first_name,
        lastName: user.last_name,
        displayName: user.display_name,
        profilePhotoUrl: user.profile_photo_url,
        country: user.country,
        preferredLanguage: user.preferred_language,
      },
    };
  }

  async getActiveSessions(userId: string, currentSessionId?: string) {
    const sessions = await authRepository.getUserActiveSessions(userId);
    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.device_name,
      deviceType: s.device_type,
      lastIp: s.last_ip,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const revoked = await authRepository.revokeUserSessionById(userId, sessionId);
    if (!revoked) {
      throw { status: 404, message: 'Session not found or already revoked.' };
    }
    return { message: 'Session revoked successfully.' };
  }
}

export const authService = new AuthService();
