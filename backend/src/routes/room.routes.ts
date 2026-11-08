import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../controllers/room.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID, validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const roomBodySchema = z.object({
  branch_id: z.string().uuid('ID chi nhánh không hợp lệ'),
  name: z.string().min(1, 'Tên phòng không được để trống'),
  capacity: z.number().int().positive().optional(),
  room_type: z.string().optional(),
});
const createRoomSchema = z.object({ body: roomBodySchema });

const updateRoomSchema = z.object({
  body: roomBodySchema.partial().extend({
    is_active: z.boolean().optional(),
  }),
});

router.get('/', requireRole(ACCESS.ADMIN_STAFF_TEACHER_API), getRooms);
router.post('/', requireRole(ACCESS.ADMIN_STAFF), validate(createRoomSchema), createRoom);
router.put(
  '/:id',
  requireRole(ACCESS.ADMIN_STAFF),
  validateUUID(['id']),
  validate(updateRoomSchema),
  updateRoom
);
router.delete('/:id', requireRole(ACCESS.ADMIN_STAFF), validateUUID(['id']), deleteRoom);

export default router;
