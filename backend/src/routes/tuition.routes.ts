import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { CreateTuitionSchema, RecordPaymentSchema } from '../validators/tuition.validator';
import {
  getTuitions,
  getOverdueTuitions,
  createTuition,
  bulkGenerateTuitions,
  updateTuition,
  deleteTuition,
  getTuitionPayments,
  recordPayment,
} from '../controllers/tuition.controller';

const router = Router();

// Tất cả route yêu cầu đăng nhập
router.use(authMiddleware);

// Danh sách học phí & tổng kết
router.get('/', requireRole(ACCESS.ADMIN_STAFF), getTuitions);
router.get('/overdue', requireRole(ACCESS.ADMIN_STAFF), getOverdueTuitions);

// CRUD học phí
router.post('/', requireRole(ACCESS.ADMIN_STAFF), validate(CreateTuitionSchema), createTuition);
router.post('/bulk-generate', requireRole(ACCESS.ADMIN_STAFF_SUPER_ADMIN), bulkGenerateTuitions);
router.patch('/:id', requireRole(ACCESS.ADMIN_STAFF_SUPER_ADMIN), updateTuition);
router.delete('/:id', requireRole(ACCESS.ADMIN_SUPER_ADMIN), deleteTuition);

// Thanh toán học phí
router.get('/:id/payments', requireRole(ACCESS.ADMIN_STAFF), getTuitionPayments);
router.post(
  '/:id/payments',
  requireRole(ACCESS.ADMIN_STAFF),
  validate(RecordPaymentSchema),
  recordPayment
);

export default router;
