import { Request, Response } from 'express';
import { sendError } from '../utils/response';

export const notFound = (req: Request, res: Response) => {
  sendError(res, {
    status: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
