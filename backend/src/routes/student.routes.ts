import { Router } from 'express';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../controllers/student.controller';
import { requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireRole(['admin', 'staff']), getStudents);
router.post('/', requireRole(['admin', 'staff']), createStudent);
router.put('/:id', requireRole(['admin', 'staff']), updateStudent);
router.delete('/:id', requireRole(['admin', 'staff']), deleteStudent);

export default router;
