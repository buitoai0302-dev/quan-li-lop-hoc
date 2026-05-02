import { Router } from 'express';
import { getWeeklySchedule, createSession, updateSession, deleteSession } from '../controllers/schedule.controller';
import { requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/weekly', requireRole(['admin', 'staff', 'teacher', 'student']), getWeeklySchedule);
router.post('/sessions', requireRole(['admin', 'staff']), createSession);
router.put('/sessions/:id', requireRole(['admin', 'staff']), updateSession);
router.delete('/sessions/:id', requireRole(['admin', 'staff']), deleteSession);

export default router;
