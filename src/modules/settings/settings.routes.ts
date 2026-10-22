import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  getPreferences,
  createPreferences,
  updatePreferences,
  getPrivacySettings,
  updatePrivacySettings,
} from './settings.controller';
import {
  createPreferencesSchema,
  updatePreferencesSchema,
  updatePrivacySchema,
} from './settings.validation';
import {
  getPreferences as getNotificationPreferences,
  updatePreferences as updateNotificationPreferences,
} from '../notifications/notifications.controller';
import { updateNotificationPreferencesSchema } from '../notifications/notifications.validation';

const router = Router();

// All settings endpoints require authentication
router.use(authenticate);

// ---------------- USER PREFERENCES ----------------
router.get('/preferences', getPreferences);
router.post('/preferences', validate({ body: createPreferencesSchema }), createPreferences);
router.put('/preferences', validate({ body: updatePreferencesSchema }), updatePreferences);
router.patch('/preferences', validate({ body: updatePreferencesSchema }), updatePreferences);

// ---------------- PRIVACY SETTINGS ----------------
router.get('/privacy', getPrivacySettings);
router.put('/privacy', validate({ body: updatePrivacySchema }), updatePrivacySettings);
router.patch('/privacy', validate({ body: updatePrivacySchema }), updatePrivacySettings);

// ---------------- NOTIFICATION PREFERENCES ----------------
router.get('/notifications', getNotificationPreferences);
router.put('/notifications', validate({ body: updateNotificationPreferencesSchema }), updateNotificationPreferences);
router.patch('/notifications', validate({ body: updateNotificationPreferencesSchema }), updateNotificationPreferences);

export default router;
