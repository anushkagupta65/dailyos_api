import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes';
import authRoutes from '../modules/auth/auth.routes';
import profileRoutes from '../modules/profile/profile.routes';
import commitmentsRoutes from '../modules/commitments/commitments.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import tasksRoutes from '../modules/tasks/tasks.routes';
import prioritiesRoutes from '../modules/priorities/priorities.routes';
import intentionsRoutes from '../modules/intentions/intentions.routes';
import notesRoutes from '../modules/notes/notes.routes';
import learningRoutes from '../modules/learning/learning.routes';

import reviewsRoutes from '../modules/reviews/reviews.routes';
import financeRoutes from '../modules/finance/finance.routes';
import insightsRoutes from '../modules/insights/insights.routes';
import settingsRoutes from '../modules/settings/settings.routes';
import dataRoutes from '../modules/data_management/data.routes';
import attachmentsRoutes from '../modules/attachments/attachments.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import syncRoutes from '../modules/sync/sync.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/profiles', profileRoutes);
router.use('/profile', profileRoutes);
router.use('/habits', commitmentsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/tasks', tasksRoutes);
router.use('/priorities', prioritiesRoutes);
router.use('/intentions', intentionsRoutes);
router.use('/notes', notesRoutes);
router.use('/learning', learningRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/finance', financeRoutes);
router.use('/investments', financeRoutes);
router.use('/insights', insightsRoutes);
router.use('/settings', settingsRoutes);
router.use('/data', dataRoutes);
router.use('/attachments', attachmentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/sync', syncRoutes);

export default router;

