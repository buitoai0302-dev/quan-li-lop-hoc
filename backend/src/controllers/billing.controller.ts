import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ValidationError, NotFoundError } from '../utils/errors';
import { createVNPayUrl, verifyVNPayReturn } from '../services/vnpay.service';
import { createMoMoUrl, verifyMoMoSignature } from '../services/momo.service';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://eduschedule.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://eduschedule-backend.onrender.com';

// ─── POST /api/billing/create-payment-url ──────────────────────────────────
// Tạo URL thanh toán cho việc nâng cấp gói (SaaS billing)
export const createPaymentUrl = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { plan_id, gateway } = req.body; // gateway: 'vnpay' | 'momo' | 'stripe'

    if (!plan_id || !gateway) {
      throw new ValidationError(
        'Thiếu thông tin gói hoặc cổng thanh toán',
        'MISSING_REQUIRED_FIELDS'
      );
    }

    // Lấy thông tin gói
    const planResult = await pool.query(
      `SELECT * FROM plan_definitions WHERE id = $1 AND is_active = true`,
      [plan_id]
    );
    if (planResult.rows.length === 0)
      throw new NotFoundError('Không tìm thấy gói dịch vụ', 'PLAN_NOT_FOUND');
    const plan = planResult.rows[0];

    const amount = plan.price_monthly || plan.price || 0;
    if (amount <= 0) throw new ValidationError('Gói này không yêu cầu thanh toán', 'ZERO_AMOUNT');

    // Tạo invoice record với status 'pending'
    const orderId = `INV-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    const invoiceResult = await pool.query(
      `INSERT INTO billing_invoices (tenant_id, plan_id, amount, currency, payment_gateway, status, gateway_order_id)
       VALUES ($1, $2, $3, 'VND', $4, 'pending', $5)
       RETURNING *`,
      [tenantId, plan_id, amount, gateway, orderId]
    );
    const invoice = invoiceResult.rows[0];

    let paymentUrl: string;
    const returnUrl = `${FRONTEND_URL}/billing/return?gateway=${gateway}`;
    const notifyUrl = `${BACKEND_URL}/api/billing/webhook/${gateway}`;
    const orderInfo = `Nang cap goi ${plan.name} - EduSchedule`;

    if (gateway === 'vnpay') {
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '127.0.0.1';
      paymentUrl = createVNPayUrl({ orderId, amount, orderInfo, returnUrl, ipAddr: ip });
    } else if (gateway === 'momo') {
      const momoResp = await createMoMoUrl({ orderId, amount, orderInfo, returnUrl, notifyUrl });
      if (momoResp.resultCode !== 0) {
        throw new ValidationError(`MoMo: ${momoResp.message}`, 'MOMO_ERROR');
      }
      paymentUrl = momoResp.payUrl;
    } else {
      throw new ValidationError('Cổng thanh toán chưa được hỗ trợ', 'UNSUPPORTED_GATEWAY');
    }

    res.json({ paymentUrl, invoiceId: invoice.id, orderId });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/billing/webhook/vnpay (VNPay return URL) ──────────────────────
export const handleVNPayReturn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query as Record<string, string>;
    const isValid = verifyVNPayReturn(query);
    const responseCode = query['vnp_ResponseCode'];
    const orderId = query['vnp_TxnRef'];
    const transactionId = query['vnp_TransactionNo'];

    if (!isValid) {
      return res.redirect(`${FRONTEND_URL}/billing/return?status=error&message=invalid_signature`);
    }

    if (responseCode === '00') {
      // Thanh toán thành công
      await activateInvoice(orderId, transactionId, query);
      return res.redirect(`${FRONTEND_URL}/billing/return?status=success&orderId=${orderId}`);
    } else {
      await pool.query(
        `UPDATE billing_invoices SET status = 'failed', gateway_response = $1 WHERE gateway_order_id = $2`,
        [JSON.stringify(query), orderId]
      );
      return res.redirect(`${FRONTEND_URL}/billing/return?status=failed&code=${responseCode}`);
    }
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/billing/webhook/momo ─────────────────────────────────────────
export const handleMoMoWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const isValid = verifyMoMoSignature(body);

    if (!isValid) return res.status(400).json({ error: 'Invalid signature' });

    if (body.resultCode === 0) {
      await activateInvoice(body.orderId, String(body.transId), body);
      return res.json({ status: 'success' });
    } else {
      await pool.query(
        `UPDATE billing_invoices SET status = 'failed', gateway_response = $1 WHERE gateway_order_id = $2`,
        [JSON.stringify(body), body.orderId]
      );
      return res.json({ status: 'failed' });
    }
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/billing/invoices ───────────────────────────────────────────────
export const getBillingInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;

    const result = await pool.query(
      `SELECT bi.*, pd.name AS plan_name
       FROM billing_invoices bi
       JOIN plan_definitions pd ON bi.plan_id = pd.id
       WHERE bi.tenant_id = $1
       ORDER BY bi.created_at DESC
       LIMIT 50`,
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// ─── Helper: Kích hoạt gói sau khi thanh toán thành công ────────────────────
async function activateInvoice(orderId: string, transactionId: string, gatewayResponse: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lấy invoice
    const invoiceResult = await client.query(
      `SELECT * FROM billing_invoices WHERE gateway_order_id = $1`,
      [orderId]
    );
    if (invoiceResult.rows.length === 0)
      throw new Error(`Invoice not found for orderId: ${orderId}`);
    const invoice = invoiceResult.rows[0];

    // Tính ngày hết hạn (mặc định 30 ngày)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Cập nhật invoice
    await client.query(
      `UPDATE billing_invoices SET
         status = 'paid',
         gateway_transaction_id = $1,
         gateway_response = $2,
         paid_at = NOW(),
         expires_at = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [transactionId, JSON.stringify(gatewayResponse), expiresAt, invoice.id]
    );

    // Kích hoạt gói cho tenant
    await client.query(
      `UPDATE tenants SET plan_id = $1, plan_expires_at = $2, updated_at = NOW() WHERE id = $3`,
      [invoice.plan_id, expiresAt, invoice.tenant_id]
    );

    // Hủy các plan_request pending nếu có
    await client.query(
      `UPDATE plan_requests SET status = 'approved', updated_at = NOW()
       WHERE tenant_id = $1 AND plan_id = $2 AND status = 'pending'`,
      [invoice.tenant_id, invoice.plan_id]
    );

    await client.query('COMMIT');
    console.log(
      `[Billing] Invoice ${invoice.id} paid. Tenant ${invoice.tenant_id} upgraded to plan ${invoice.plan_id}`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Billing] activateInvoice error:', err);
    throw err;
  } finally {
    client.release();
  }
}
