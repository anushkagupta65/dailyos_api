import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { pool } from '../config/database';

export interface AuthenticatedUser {
  id: string;
  email: string;
  status: string;
  onboarding_completed: boolean;
  email_verified_at: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      res.status(401).json({ message: 'Authentication required. No token provided.' });
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({ message: 'Access token has expired.' });
        return;
      }
      res.status(401).json({ message: 'Invalid access token.' });
      return;
    }

    const { rows } = await pool.query<AuthenticatedUser>(
      `SELECT id, email, status, onboarding_completed, email_verified_at 
       FROM users 
       WHERE id = $1 AND deleted_at IS NULL`,
      [payload.userId]
    );

    if (rows.length === 0) {
      res.status(401).json({ message: 'User not found or account no longer exists.' });
      return;
    }

    const user = rows[0];

    if (user.status === 'suspended') {
      res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
      return;
    }

    if (user.status === 'deleted') {
      res.status(403).json({ message: 'This account has been deleted.' });
      return;
    }

    req.user = user;
    req.sessionId = payload.sessionId;
    next();
  } catch (error) {
    next(error);
  }
};
