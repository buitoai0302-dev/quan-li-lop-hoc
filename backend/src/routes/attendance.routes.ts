import { Router } from 'express';
import * as attendanceController from '../controllers/attendance.controller';

const router = Router();

router.get('/session/:sessionId', attendanceController.getAttendanceBySession);
router.post('/session/:sessionId', attendanceController.recordAttendance);

export default router;
