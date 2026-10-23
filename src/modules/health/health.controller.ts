import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';

export const getHealth = (_req: Request, res: Response) => {
  sendSuccess(res, {
    message: 'Health check successful',
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
};
