import { Router } from 'express';
import { getWeeklySchedule, createSession, updateSession, deleteSession } from '../controllers/schedule.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID, validateBodyUUID } from '../middlewares/validate.middleware';

const router = Router();

router.get('/weekly', requireRole(['admin', 'staff', 'teacher', 'student']), getWeeklySchedule);
router.post('/sessions', requireRole(['admin', 'staff']), validateBodyUUID(['classId', 'roomId', 'teacherId']), createSession);
router.put('/sessions/:id', requireRole(['admin', 'staff']), validateUUID(['id']), updateSession);
router.delete('/sessions/:id', requireRole(['admin', 'staff']), validateUUID(['id']), deleteSession);

export default router;
