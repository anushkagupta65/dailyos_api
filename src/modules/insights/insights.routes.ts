import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  getDashboardInsights,
  getHabitInsights,
  getTaskInsights,
  getReviewInsights,
  getFinancialInsights,
  getLearningInsights,
  getReports,
  getPreferences,
  updatePreferences,
  listSnapshots,
  getSnapshotById,
  generateSnapshot,
} from './insights.controller';
import {
  insightQuerySchema,
  updateInsightPreferencesSchema,
  createSnapshotSchema,
  listSnapshotsQuerySchema,
  idParamSchema,
} from './insights.validation';

const router = Router();

// All insight endpoints require authentication
router.use(authenticate);

// ---------------- INSIGHTS ----------------
router.get('/', validate({ query: insightQuerySchema }), getDashboardInsights);
router.get('/dashboard', validate({ query: insightQuerySchema }), getDashboardInsights);
router.get('/habits', validate({ query: insightQuerySchema }), getHabitInsights);
router.get('/tasks', validate({ query: insightQuerySchema }), getTaskInsights);
router.get('/productivity', validate({ query: insightQuerySchema }), getTaskInsights);
router.get('/reviews', validate({ query: insightQuerySchema }), getReviewInsights);
router.get('/performance', validate({ query: insightQuerySchema }), getReviewInsights);
router.get('/finance', validate({ query: insightQuerySchema }), getFinancialInsights);
router.get('/learning', validate({ query: insightQuerySchema }), getLearningInsights);
router.get('/reports', validate({ query: insightQuerySchema }), getReports);

// ---------------- PREFERENCES ----------------
router.get('/preferences', getPreferences);
router.put('/preferences', validate({ body: updateInsightPreferencesSchema }), updatePreferences);
router.patch('/preferences', validate({ body: updateInsightPreferencesSchema }), updatePreferences);

// ---------------- SNAPSHOTS (CACHED INSIGHTS) ----------------
router.get('/snapshots', validate({ query: listSnapshotsQuerySchema }), listSnapshots);
router.post('/snapshots', validate({ body: createSnapshotSchema }), generateSnapshot);
router.post('/snapshots/generate', validate({ body: createSnapshotSchema }), generateSnapshot);
router.get('/snapshots/:id', validate({ params: idParamSchema }), getSnapshotById);

export default router;
