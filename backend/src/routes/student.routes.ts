import { Router } from 'express';
import { getStudents, createStudent, updateStudent, deleteStudent, bulkImport } from '../controllers/student.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID } from '../middlewares/validate.middleware';
import { enforceLimit } from '../middlewares/feature.middleware';

const router = Router();

router.get('/', requireRole(['admin', 'staff', 'teacher']), getStudents);
router.post(
  '/', 
  requireRole(['admin', 'staff']), 
  enforceLimit('max_students', 'SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND is_deleted = false'),
  createStudent
);
router.post('/bulk', requireRole(['admin', 'staff']), bulkImport);
router.put('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), updateStudent);
router.delete('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), deleteStudent);

export default router;
