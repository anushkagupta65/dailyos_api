import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service';

export const getPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const preferences = await settingsService.getPreferences(req.user!.id);
    res.status(200).json({ preferences });
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
    res.status(201).json({
      message: 'User preferences created successfully.',
      preferences,
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
    res.status(200).json({
      message: 'User preferences updated successfully.',
      preferences,
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
    res.status(200).json({ privacy });
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
    res.status(200).json({
      message: 'Privacy settings updated successfully.',
      privacy,
    });
  } catch (err) {
    next(err);
  }
};
