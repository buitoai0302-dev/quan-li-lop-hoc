import { Router } from 'express';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from '../controllers/teacher.controller';
import { enforceLimit } from '../middlewares/feature.middleware';
import { requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireRole(['admin', 'staff', 'teacher', 'student']), getTeachers);

// Check if max_teachers is reached before creating
router.post(
  '/', 
  requireRole(['admin']),
  enforceLimit('max_teachers', 'SELECT COUNT(*) FROM teachers WHERE tenant_id = $1 AND is_active = true'),
  createTeacher
);

router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);

export default router;
