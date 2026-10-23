import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { sendError } from '../utils/response';

export interface AppError extends Error {
  status?: number;
  errors?: any[];
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = typeof err.status === 'number' ? err.status : 500;
  
  if (status >= 500) {
    console.error('Unhandled server error:', err);
  }

  const message =
    status === 500 && env.nodeEnv === 'production'
      ? 'Internal server error'
      : (err.message || 'An unexpected error occurred');

  sendError(res, {
    status,
    message,
    errors: err.errors,
  });
};
