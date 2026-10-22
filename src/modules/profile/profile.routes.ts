import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  getPersonalProfile,
  updatePersonalProfile,
  updateProfilePhoto,
  getHealthProfile,
  updateHealthProfile,
  deleteHealthProfile,
  addBodyMeasurement,
  getBodyMeasurements,
  updateBodyMeasurement,
  deleteBodyMeasurement,
  getProfessionalProfile,
  updateProfessionalProfile,
  getLifestyleProfile,
  updateLifestyleProfile,
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  updateGoalStatus,
  deleteGoal,
  getCompleteProfile,
} from './profile.controller';
import {
  uploadAttachment,
  getProfileAttachments,
} from '../attachments/attachments.controller';
import { uploadAttachmentSchema } from '../attachments/attachments.validation';
import {
  personalProfileSchema,
  updatePhotoSchema,
  healthProfileSchema,
  measurementSchema,
  professionalProfileSchema,
  lifestyleProfileSchema,
  createGoalSchema,
  updateGoalSchema,
  updateGoalStatusSchema,
  idParamSchema,
  paginationQuerySchema,
  goalsQuerySchema,
} from './profile.validation';
import {
  getPreferences,
  createPreferences,
  updatePreferences,
  getPrivacySettings,
  updatePrivacySettings,
} from '../settings/settings.controller';
import {
  createPreferencesSchema,
  updatePreferencesSchema,
  updatePrivacySchema,
} from '../settings/settings.validation';

const router = Router();

// All profile endpoints require authentication
router.use(authenticate);

// ---------------- COMPLETE PROFILE ----------------
router.get('/complete', getCompleteProfile);

// ---------------- PERSONAL PROFILE ----------------
router.get('/personal', getPersonalProfile);
router.put('/personal', validate({ body: personalProfileSchema }), updatePersonalProfile);
router.post('/personal/photo', validate({ body: updatePhotoSchema }), updateProfilePhoto);
router.post('/attachment', validate({ body: uploadAttachmentSchema }), uploadAttachment);
router.get('/attachments', getProfileAttachments);

// ---------------- HEALTH PROFILE ----------------
router.get('/health', getHealthProfile);
router.put('/health', validate({ body: healthProfileSchema }), updateHealthProfile);
router.delete('/health', deleteHealthProfile);

// ---------------- BODY MEASUREMENTS ----------------
router.post('/measurements', validate({ body: measurementSchema }), addBodyMeasurement);
router.get('/measurements', validate({ query: paginationQuerySchema }), getBodyMeasurements);
router.put('/measurements/:id', validate({ params: idParamSchema, body: measurementSchema.partial() }), updateBodyMeasurement);
router.delete('/measurements/:id', validate({ params: idParamSchema }), deleteBodyMeasurement);

// ---------------- PROFESSIONAL PROFILE ----------------
router.get('/professional', getProfessionalProfile);
router.put('/professional', validate({ body: professionalProfileSchema }), updateProfessionalProfile);

// ---------------- LIFESTYLE PROFILE ----------------
router.get('/lifestyle', getLifestyleProfile);
router.put('/lifestyle', validate({ body: lifestyleProfileSchema }), updateLifestyleProfile);

// ---------------- PERSONAL GOALS ----------------
router.post('/goals', validate({ body: createGoalSchema }), createGoal);
router.get('/goals', validate({ query: goalsQuerySchema }), getGoals);
router.get('/goals/:id', validate({ params: idParamSchema }), getGoalById);
router.put('/goals/:id', validate({ params: idParamSchema, body: updateGoalSchema }), updateGoal);
router.patch('/goals/:id/status', validate({ params: idParamSchema, body: updateGoalStatusSchema }), updateGoalStatus);
router.delete('/goals/:id', validate({ params: idParamSchema }), deleteGoal);

// ---------------- PREFERENCES & PRIVACY (PROFILE SETTINGS) ----------------
router.get('/preferences', getPreferences);
router.post('/preferences', validate({ body: createPreferencesSchema }), createPreferences);
router.put('/preferences', validate({ body: updatePreferencesSchema }), updatePreferences);
router.patch('/preferences', validate({ body: updatePreferencesSchema }), updatePreferences);

router.get('/privacy', getPrivacySettings);
router.put('/privacy', validate({ body: updatePrivacySchema }), updatePrivacySettings);
router.patch('/privacy', validate({ body: updatePrivacySchema }), updatePrivacySettings);

export default router;


