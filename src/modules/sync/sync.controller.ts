import { Request, Response, NextFunction } from 'express';
import { syncService } from './sync.service';

export const registerDevice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await syncService.registerDevice(req.user!.id, req.body);
    res.status(201).json({ message: 'Device registered successfully.', ...result });
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
    res.status(200).json({ devices });
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
    res.status(200).json({ device });
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
    res.status(200).json(result);
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
    res.status(200).json(result);
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
    res.status(200).json(result);
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
