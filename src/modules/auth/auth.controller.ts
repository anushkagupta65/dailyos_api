import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { env } from '../../config/env';

const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
};

const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/api/auth',
  });
};

const getClientInfo = (req: Request) => {
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.ip ||
    req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const deviceName = (req.headers['x-device-name'] as string) || undefined;
  const deviceType = (req.headers['x-device-type'] as string) || undefined;
  return { ipAddress, userAgent, deviceName, deviceType };
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientInfo = getClientInfo(req);
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
      ...clientInfo,
    });

    setRefreshTokenCookie(res, result.refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const googleSignIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientInfo = getClientInfo(req);
    const result = await authService.googleSignIn({
      idToken: req.body.idToken,
      ...clientInfo,
    });

    setRefreshTokenCookie(res, result.refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.body.refreshToken || req.cookies?.refresh_token;
    const clientInfo = getClientInfo(req);
    const result = await authService.refreshToken(token, clientInfo.ipAddress);

    setRefreshTokenCookie(res, result.refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawRefreshToken = req.body?.refreshToken || req.cookies?.refresh_token;
    await authService.logout(req.sessionId, rawRefreshToken);

    clearRefreshTokenCookie(res);
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

export const logoutFromAllDevices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const result = await authService.logoutFromAllDevices(userId);

    clearRefreshTokenCookie(res);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.verifyEmail(req.body.token);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.resetPassword({
      token: req.body.token,
      newPassword: req.body.newPassword,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.getCurrentUser(req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.updatePassword(req.user!.id, {
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getActiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.getActiveSessions(req.user!.id, req.sessionId);
    res.status(200).json({ sessions: result });
  } catch (err) {
    next(err);
  }
};

export const revokeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.revokeSession(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
