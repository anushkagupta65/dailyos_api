import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service';
import { sendSuccess } from '../../utils/response';

export const getPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const preferences = await settingsService.getPreferences(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'User preferences retrieved successfully.',
      data: { preferences },
    });
  } catch (err) {
    next(err);
  }
};

export const createPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const preferences = await settingsService.createPreferences(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'User preferences created successfully.',
      data: { preferences },
    });
  } catch (err) {
    next(err);
  }
};

export const updatePreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const preferences = await settingsService.updatePreferences(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'User preferences updated successfully.',
      data: { preferences },
    });
  } catch (err) {
    next(err);
  }
};

export const getPrivacySettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const privacy = await settingsService.getPrivacySettings(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Privacy settings retrieved successfully.',
      data: { privacy },
    });
  } catch (err) {
    next(err);
  }
};

export const updatePrivacySettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const privacy = await settingsService.updatePrivacySettings(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Privacy settings updated successfully.',
      data: { privacy },
    });
  } catch (err) {
    next(err);
  }
};
