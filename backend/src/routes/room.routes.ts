import { Router } from 'express';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../controllers/room.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID } from '../middlewares/validate.middleware';

const router = Router();

router.get('/', requireRole(['admin', 'staff', 'teacher']), getRooms);
router.post('/', requireRole(['admin', 'staff']), createRoom);
router.put('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), updateRoom);
router.delete('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), deleteRoom);

export default router;
