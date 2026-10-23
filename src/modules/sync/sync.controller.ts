import { Request, Response, NextFunction } from 'express';
import { syncService } from './sync.service';
import { sendSuccess } from '../../utils/response';

export const registerDevice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await syncService.registerDevice(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Device registered successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const listDevices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const devices = await syncService.listDevices(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Devices retrieved successfully.',
      data: { devices },
    });
  } catch (err) {
    next(err);
  }
};

export const getDevice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const device = await syncService.getDevice(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Device retrieved successfully.',
      data: { device },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDevice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await syncService.deleteDevice(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Device deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

export const getSyncStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await syncService.getSyncStatus(req.user!.id, query.deviceId as string);
    sendSuccess(res, {
      status: 200,
      message: 'Sync status retrieved successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const pull = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await syncService.pull(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Sync pull completed successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const push = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await syncService.push(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Sync push completed successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
