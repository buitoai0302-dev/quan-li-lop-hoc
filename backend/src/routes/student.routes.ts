import { Router } from 'express';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../controllers/student.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID } from '../middlewares/validate.middleware';

const router = Router();

router.get('/', requireRole(['admin', 'staff']), getStudents);
router.post('/', requireRole(['admin', 'staff']), createStudent);
router.put('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), updateStudent);
router.delete('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), deleteStudent);

export default router;
