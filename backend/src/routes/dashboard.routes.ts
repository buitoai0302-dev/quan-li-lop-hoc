import { Router } from 'express';
import { getDashboardStats, getActivities } from '../controllers/dashboard.controller';

const router = Router();

router.get('/stats', getDashboardStats);
router.get('/activities', getActivities);

export default router;
