import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createPaymentUrl,
  handleVNPayReturn,
  handleMoMoWebhook,
  getBillingInvoices,
} from '../controllers/billing.controller';

const router = Router();

// Public webhook endpoints (không cần JWT — cổng thanh toán gọi trực tiếp)
router.get('/webhook/vnpay', handleVNPayReturn); // VNPay redirect sau thanh toán
router.post('/webhook/momo', handleMoMoWebhook); // MoMo IPN webhook

// Protected endpoints
router.use(authMiddleware);
router.post('/create-payment-url', createPaymentUrl);
router.get('/invoices', getBillingInvoices);

export default router;
