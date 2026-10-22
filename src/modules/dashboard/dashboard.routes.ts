import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { getDashboard, getPreferences, updatePreferences } from './dashboard.controller';
import { dashboardQuerySchema, updatePreferencesSchema } from './dashboard.validation';

const router = Router();

// All dashboard endpoints require authentication
router.use(authenticate);

router.get('/', validate({ query: dashboardQuerySchema }), getDashboard);
router.get('/preferences', getPreferences);
router.put('/preferences', validate({ body: updatePreferencesSchema }), updatePreferences);

export default router;
