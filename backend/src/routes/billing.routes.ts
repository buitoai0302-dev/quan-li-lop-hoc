import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import {
  createPaymentUrl,
  handleVNPayReturn,
  handleVNPayIPN,
  handleMoMoWebhook,
  getBillingInvoices,
  getBillingInvoiceStatus,
} from '../controllers/billing.controller';

const router = Router();

// Public webhook endpoints (không cần JWT — cổng thanh toán gọi trực tiếp)
router.get('/webhook/vnpay', handleVNPayReturn); // VNPay redirect sau thanh toán
router.get('/webhook/vnpay/ipn', handleVNPayIPN);
router.post('/webhook/momo', handleMoMoWebhook); // MoMo IPN webhook

// Protected endpoints
router.use(authMiddleware);
router.post('/create-payment-url', requireRole(ACCESS.ADMIN), createPaymentUrl);
router.get('/invoices', requireRole(ACCESS.ADMIN), getBillingInvoices);
router.get('/invoices/:orderId', requireRole(ACCESS.ADMIN), getBillingInvoiceStatus);

export default router;
