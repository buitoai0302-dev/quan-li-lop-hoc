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
router.get('/', getTuitions);
router.get('/overdue', getOverdueTuitions);

// CRUD học phí
router.post(
  '/',
  requireRole(['super_admin', 'center_admin', 'manager']),
  validate(CreateTuitionSchema),
  createTuition
);
router.post('/bulk-generate', requireRole(['admin', 'staff', 'super_admin']), bulkGenerateTuitions);
router.patch('/:id', requireRole(['admin', 'staff', 'super_admin']), updateTuition);
router.delete('/:id', requireRole(['admin', 'super_admin']), deleteTuition);

// Thanh toán học phí
router.get('/:id/payments', getTuitionPayments);
router.post(
  '/:id/payments',
  requireRole(['super_admin', 'center_admin', 'manager', 'accountant']),
  validate(RecordPaymentSchema),
  recordPayment
);

export default router;
