import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  createNotification,
  listNotifications,
  getNotificationById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getPreferences,
  updatePreferences,
  generateReminders,
} from './notifications.controller';
import {
  idParamSchema,
  createNotificationSchema,
  notificationsQuerySchema,
  updateNotificationPreferencesSchema,
} from './notifications.validation';

const router = Router();

// All notification endpoints require authentication
router.use(authenticate);

// ---------------- PREFERENCES ----------------
router.get('/preferences', getPreferences);
router.put('/preferences', validate({ body: updateNotificationPreferencesSchema }), updatePreferences);

// ---------------- BULK & AGGREGATE ACTIONS ----------------
router.get('/unread-count', getUnreadCount);
router.post('/mark-all-read', markAllAsRead);
router.patch('/read-all', markAllAsRead);
router.post('/reminders/generate', generateReminders);
router.delete('/read', deleteAllRead);

// ---------------- NOTIFICATIONS CRUD ----------------
router.post('/', validate({ body: createNotificationSchema }), createNotification);
router.get('/', validate({ query: notificationsQuerySchema }), listNotifications);
router.delete('/', deleteAllRead);
router.get('/:id', validate({ params: idParamSchema }), getNotificationById);
router.patch('/:id/read', validate({ params: idParamSchema }), markAsRead);
router.put('/:id/read', validate({ params: idParamSchema }), markAsRead);
router.delete('/:id', validate({ params: idParamSchema }), deleteNotification);

export default router;
