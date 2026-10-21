import { pool, withTransaction } from '../../config/database';
import { PoolClient } from 'pg';

export interface UserRecord {
  id: string;
  email: string;
  email_verified_at: Date | null;
  password_hash: string | null;
  status: 'active' | 'pending' | 'suspended' | 'deleted';
  onboarding_completed: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface AuthAccountRecord {
  id: string;
  user_id: string;
  provider: 'google' | 'email';
  provider_user_id: string;
  provider_email: string | null;
  created_at: Date;
}

export interface UserSessionRecord {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  device_name: string | null;
  device_type: string | null;
  last_ip: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export class AuthRepository {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const { rows } = await pool.query<UserRecord>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return rows[0] || null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const { rows } = await pool.query<UserRecord>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  }

  async findAuthAccount(
    provider: 'google' | 'email',
    providerUserId: string
  ): Promise<AuthAccountRecord | null> {
    const { rows } = await pool.query<AuthAccountRecord>(
      'SELECT * FROM auth_accounts WHERE provider = $1 AND provider_user_id = $2',
      [provider, providerUserId]
    );
    return rows[0] || null;
  }

  async createUserWithEmail(
    params: {
      email: string;
      passwordHash: string;
      firstName?: string;
      lastName?: string;
    },
    verificationTokenHash: string,
    expiresAt: Date
  ): Promise<{ user: UserRecord; verificationTokenId: string }> {
    return withTransaction(async (client: PoolClient) => {
      // 1. Create user
      const userRes = await client.query<UserRecord>(
        `INSERT INTO users (email, password_hash, status)
         VALUES ($1, $2, 'active')
         RETURNING *`,
        [params.email, params.passwordHash]
      );
      const user = userRes.rows[0];

      // 2. Create auth_account
      await client.query(
        `INSERT INTO auth_accounts (user_id, provider, provider_user_id, provider_email)
         VALUES ($1, 'email', $2, $3)`,
        [user.id, params.email, params.email]
      );

      // 3. Create initial user_profile
      const firstName = params.firstName || '';
      const lastName = params.lastName || '';
      const displayName = firstName ? `${firstName} ${lastName}`.trim() : params.email.split('@')[0];
      await client.query(
        `INSERT INTO user_profiles (user_id, first_name, last_name, display_name)
         VALUES ($1, $2, $3, $4)`,
        [user.id, firstName, lastName, displayName]
      );

      // 4. Create verification token
      const tokenRes = await client.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, verificationTokenHash, expiresAt]
      );

      // 5. Log security event
      await client.query(
        `INSERT INTO user_security_events (user_id, event_type, metadata)
         VALUES ($1, 'USER_REGISTERED', $2)`,
        [user.id, JSON.stringify({ provider: 'email' })]
      );

      return { user, verificationTokenId: tokenRes.rows[0].id };
    });
  }

  async createUserWithGoogle(params: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    pictureUrl?: string;
  }): Promise<UserRecord> {
    return withTransaction(async (client: PoolClient) => {
      // 1. Create user marked as email verified
      const userRes = await client.query<UserRecord>(
        `INSERT INTO users (email, email_verified_at, status)
         VALUES ($1, NOW(), 'active')
         RETURNING *`,
        [params.email]
      );
      const user = userRes.rows[0];

      // 2. Create auth account
      await client.query(
        `INSERT INTO auth_accounts (user_id, provider, provider_user_id, provider_email)
         VALUES ($1, 'google', $2, $3)`,
        [user.id, params.googleId, params.email]
      );

      // 3. Create user profile
      const firstName = params.firstName || '';
      const lastName = params.lastName || '';
      const displayName = params.displayName || (firstName ? `${firstName} ${lastName}`.trim() : params.email.split('@')[0]);
      await client.query(
        `INSERT INTO user_profiles (user_id, first_name, last_name, display_name, profile_photo_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, firstName, lastName, displayName, params.pictureUrl || null]
      );

      // 4. Log event
      await client.query(
        `INSERT INTO user_security_events (user_id, event_type, metadata)
         VALUES ($1, 'USER_REGISTERED_GOOGLE', $2)`,
        [user.id, JSON.stringify({ googleId: params.googleId })]
      );

      return user;
    });
  }

  async linkGoogleAccount(
    userId: string,
    googleId: string,
    email: string
  ): Promise<void> {
    await withTransaction(async (client: PoolClient) => {
      await client.query(
        `INSERT INTO auth_accounts (user_id, provider, provider_user_id, provider_email)
         VALUES ($1, 'google', $2, $3)
         ON CONFLICT (provider, provider_user_id) DO NOTHING`,
        [userId, googleId, email]
      );

      // Mark email as verified if not yet verified
      await client.query(
        `UPDATE users
         SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      await client.query(
        `INSERT INTO user_security_events (user_id, event_type, metadata)
         VALUES ($1, 'GOOGLE_ACCOUNT_LINKED', $2)`,
        [userId, JSON.stringify({ googleId })]
      );
    });
  }

  async createSession(params: {
    userId: string;
    refreshTokenHash: string;
    deviceName?: string;
    deviceType?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<UserSessionRecord> {
    const { rows } = await pool.query<UserSessionRecord>(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, device_name, device_type, last_ip, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        params.userId,
        params.refreshTokenHash,
        params.deviceName || null,
        params.deviceType || null,
        params.ipAddress || null,
        params.expiresAt,
      ]
    );
    return rows[0];
  }

  async findActiveSessionByTokenHash(tokenHash: string): Promise<UserSessionRecord | null> {
    const { rows } = await pool.query<UserSessionRecord>(
      `SELECT * FROM user_sessions
       WHERE refresh_token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const res = await pool.query(
      `UPDATE user_sessions
       SET revoked_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL`,
      [sessionId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async revokeUserSessionById(userId: string, sessionId: string): Promise<boolean> {
    const res = await pool.query(
      `UPDATE user_sessions
       SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [sessionId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const res = await pool.query(
      `UPDATE user_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    return res.rowCount ?? 0;
  }

  async getUserActiveSessions(userId: string): Promise<UserSessionRecord[]> {
    const { rows } = await pool.query<UserSessionRecord>(
      `SELECT id, user_id, device_name, device_type, last_ip, expires_at, created_at, revoked_at
       FROM user_sessions
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  async findVerificationToken(tokenHash: string) {
    const { rows } = await pool.query(
      `SELECT * FROM email_verification_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  async markEmailAsVerified(userId: string, tokenId: string): Promise<void> {
    await withTransaction(async (client: PoolClient) => {
      await client.query(
        'UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1',
        [tokenId]
      );
      await client.query(
        `UPDATE users
         SET email_verified_at = NOW(),
             status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
             updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );
      await client.query(
        `INSERT INTO user_security_events (user_id, event_type)
         VALUES ($1, 'EMAIL_VERIFIED')`,
        [userId]
      );
    });
  }

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await withTransaction(async (client: PoolClient) => {
      // Invalidate existing unused reset tokens for this user
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [userId]
      );
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
      );
    });
  }

  async findPasswordResetToken(tokenHash: string) {
    const { rows } = await pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  async resetPassword(userId: string, tokenId: string, passwordHash: string): Promise<void> {
    await withTransaction(async (client: PoolClient) => {
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [tokenId]
      );
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, userId]
      );
      // Revoke all existing sessions
      await client.query(
        'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId]
      );
      await client.query(
        `INSERT INTO user_security_events (user_id, event_type)
         VALUES ($1, 'PASSWORD_RESET_COMPLETED')`,
        [userId]
      );
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await withTransaction(async (client: PoolClient) => {
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, userId]
      );
      await client.query(
        `INSERT INTO user_security_events (user_id, event_type)
         VALUES ($1, 'PASSWORD_CHANGED')`,
        [userId]
      );
    });
  }

  async logLoginAttempt(params: {
    email: string;
    ipAddress?: string;
    userAgent?: string;
    successful: boolean;
    failureReason?: string;
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO login_attempts (email, ip_address, user_agent, successful, failure_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          params.email,
          params.ipAddress || null,
          params.userAgent || null,
          params.successful,
          params.failureReason || null,
        ]
      );
    } catch (err) {
      console.error('Failed to log login attempt:', err);
    }
  }

  async logSecurityEvent(params: {
    userId: string;
    eventType: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO user_security_events (user_id, event_type, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          params.userId,
          params.eventType,
          params.ipAddress || null,
          params.userAgent || null,
          JSON.stringify(params.metadata || {}),
        ]
      );
    } catch (err) {
      console.error('Failed to log security event:', err);
    }
  }

  async getUserWithProfile(userId: string) {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.email_verified_at, u.status, u.onboarding_completed, u.created_at, u.updated_at,
              p.first_name, p.last_name, p.display_name, p.profile_photo_url, p.country, p.preferred_language
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [userId]
    );
    return rows[0] || null;
  }
}

export const authRepository = new AuthRepository();
