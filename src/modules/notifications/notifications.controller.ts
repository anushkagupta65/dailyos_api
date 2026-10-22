import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';

export const createNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notificationsService.createNotification(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const listNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await notificationsService.listNotifications(req.user!.id, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getNotificationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notification = await notificationsService.getNotificationById(
      req.user!.id,
      req.params.id as string
    );
    res.status(200).json({ notification });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notificationsService.getUnreadCount(req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notificationsService.markAsRead(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notificationsService.markAllAsRead(req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notificationsService.deleteNotification(
      req.user!.id,
      req.params.id as string
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteAllRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notificationsService.deleteAllRead(req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const preferences = await notificationsService.getPreferences(req.user!.id);
    res.status(200).json({ preferences });
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
    const preferences = await notificationsService.updatePreferences(req.user!.id, req.body);
    res.status(200).json({ message: 'Notification preferences updated successfully.', preferences });
  } catch (err) {
    next(err);
  }
};

export const generateReminders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const timezone = (req.query.timezone as string) || 'UTC';
    const result = await notificationsService.generateReminders(req.user!.id, timezone);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
