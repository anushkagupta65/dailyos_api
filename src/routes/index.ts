import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes';

const router = Router();

router.use('/health', healthRoutes);
// router.use('/habits', habitRoutes);
// router.use('/expenses', expenseRoutes);

export default router;
