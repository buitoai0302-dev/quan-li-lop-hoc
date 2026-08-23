import { Router } from 'express';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../controllers/room.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID, validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const createRoomSchema = z.object({
  body: z.object({
    branch_id: z.string().uuid('ID chi nhánh không hợp lệ'),
    name: z.string().min(1, 'Tên phòng không được để trống'),
    capacity: z.number().int().positive().optional(),
    room_type: z.string().optional(),
  }),
});

const updateRoomSchema = z.object({
  body: z.object({
    branch_id: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    capacity: z.number().int().positive().optional(),
    room_type: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
});

router.get('/', requireRole(['admin', 'staff', 'teacher']), getRooms);
router.post('/', requireRole(['admin', 'staff']), validate(createRoomSchema), createRoom);
router.put(
  '/:id',
  requireRole(['admin', 'staff']),
  validateUUID(['id']),
  validate(updateRoomSchema),
  updateRoom
);
router.delete('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), deleteRoom);

export default router;
