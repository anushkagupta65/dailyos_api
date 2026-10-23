import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { sendSuccess } from '../../utils/response';

export const createNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notificationsService.createNotification(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: result.message || 'Notification created successfully.',
      data: { notification: result.notification },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Notifications retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Notification retrieved successfully.',
      data: { notification },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Unread count retrieved successfully.',
      data: result,
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Notification marked as read successfully.',
      data: { notification: result.notification },
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'All notifications marked as read successfully.',
      data: { updatedCount: result.updatedCount },
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Notification deleted successfully.',
      data: {},
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Read notifications deleted successfully.',
      data: { deletedCount: result.deletedCount },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Notification preferences retrieved successfully.',
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
    const preferences = await notificationsService.updatePreferences(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Notification preferences updated successfully.',
      data: { preferences },
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Reminders generated successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
