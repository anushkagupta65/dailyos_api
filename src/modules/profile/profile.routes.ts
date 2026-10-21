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

const router = Router();

// All profile endpoints require authentication
router.use(authenticate);

// ---------------- COMPLETE PROFILE ----------------
router.get('/complete', getCompleteProfile);

// ---------------- PERSONAL PROFILE ----------------
router.get('/personal', getPersonalProfile);
router.put('/personal', validate({ body: personalProfileSchema }), updatePersonalProfile);
router.post('/personal/photo', validate({ body: updatePhotoSchema }), updateProfilePhoto);

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

export default router;
