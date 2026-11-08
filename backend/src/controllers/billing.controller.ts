import { ERROR_CODES } from '../utils/constants';
import { logger } from '../utils/logger';
import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { createVNPayUrl, verifyVNPayReturn } from '../services/vnpay.service';
import { createMoMoUrl, verifyMoMoSignature } from '../services/momo.service';
import { config } from '../utils/config';

// ─── POST /api/billing/create-payment-url ──────────────────────────────────
// Tạo URL thanh toán cho việc nâng cấp gói (SaaS billing)
export const createPaymentUrl = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (process.env.ONLINE_PAYMENTS_ENABLED !== 'true') {
      throw new ForbiddenError(
        'Online payments are not enabled',
        ERROR_CODES.ONLINE_PAYMENTS_DISABLED
      );
    }
    const tenantId = req.tenantId || req.user?.tenantId;
    const { plan_id, gateway } = req.body;

    if (!plan_id || !gateway) {
      throw new ValidationError(
        'Thiếu thông tin gói hoặc cổng thanh toán',
        ERROR_CODES.MISSING_REQUIRED_FIELDS
      );
    }
    if (gateway !== 'vnpay' && gateway !== 'momo') {
      throw new ValidationError(
        'Cổng thanh toán chưa được hỗ trợ',
        ERROR_CODES.UNSUPPORTED_GATEWAY
      );
    }

    // Lấy thông tin gói
    const planResult = await pool.query(
      `SELECT * FROM plan_definitions WHERE id = $1 AND is_active = true`,
      [plan_id]
    );
    if (planResult.rows.length === 0)
      throw new NotFoundError('Không tìm thấy gói dịch vụ', ERROR_CODES.PLAN_NOT_FOUND);
    const plan = planResult.rows[0];

    const amount = Number(plan.price_vnd);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new ValidationError('Gói này không yêu cầu thanh toán', ERROR_CODES.ZERO_AMOUNT);
    }

    // Tạo invoice record với status 'pending'
    const orderId = `INV-${Date.now()}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const invoiceResult = await pool.query(
      `INSERT INTO billing_invoices (tenant_id, plan_id, amount, currency, payment_gateway, status, gateway_order_id)
       VALUES ($1, $2, $3, 'VND', $4, 'pending', $5)
       RETURNING *`,
      [tenantId, plan_id, amount, gateway, orderId]
    );
    const invoice = invoiceResult.rows[0];

    let paymentUrl: string;
    const returnUrl = `${config.frontendUrl()}/billing/return?orderId=${encodeURIComponent(orderId)}`;
    const notifyUrl = `${config.backendUrl()}/api/billing/webhook/${gateway}`;
    const orderInfo = `Nang cap goi ${plan.name} - EduSchedule`;

    if (gateway === 'vnpay') {
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '127.0.0.1';
      paymentUrl = createVNPayUrl({
        orderId,
        amount,
        orderInfo,
        returnUrl: `${config.backendUrl()}/api/billing/webhook/vnpay`,
        ipAddr: ip,
      });
    } else {
      const momoResp = await createMoMoUrl({ orderId, amount, orderInfo, returnUrl, notifyUrl });
      if (momoResp.resultCode !== 0) {
        throw new ValidationError(`MoMo: ${momoResp.message}`, ERROR_CODES.MOMO_ERROR);
      }
      paymentUrl = momoResp.payUrl;
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
    const isValid = verifyVNPayReturn(query) && query['vnp_TmnCode'] === process.env.VNPAY_TMN_CODE;
    const responseCode = query['vnp_ResponseCode'];
    const orderId = query['vnp_TxnRef'];
    const transactionId = query['vnp_TransactionNo'];

    if (!isValid) {
      return res.redirect(
        `${config.frontendUrl()}/billing/return?status=error&message=invalid_signature`
      );
    }

    if (responseCode === '00' && query['vnp_TransactionStatus'] === '00') {
      // Thanh toán thành công
      await activateInvoice(
        orderId,
        transactionId,
        'vnpay',
        Number(query['vnp_Amount']) / 100,
        query
      );
      return res.redirect(
        `${config.frontendUrl()}/billing/return?status=success&orderId=${orderId}`
      );
    } else {
      await pool.query(
        `UPDATE billing_invoices SET status = 'failed', gateway_response = $1
         WHERE gateway_order_id = $2 AND payment_gateway = 'vnpay' AND status = 'pending'`,
        [JSON.stringify(query), orderId]
      );
      return res.redirect(
        `${config.frontendUrl()}/billing/return?orderId=${encodeURIComponent(orderId)}`
      );
    }
  } catch (error) {
    next(error);
  }
};

// Configure this URL as the VNPay IPN endpoint so payment completion does not
// depend on the customer's browser returning to the site.
export const handleVNPayIPN = async (req: AuthRequest, res: Response) => {
  const query = req.query as Record<string, string>;
  if (!verifyVNPayReturn(query) || query['vnp_TmnCode'] !== process.env.VNPAY_TMN_CODE) {
    return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
  }
  try {
    const orderId = query['vnp_TxnRef'];
    if (query['vnp_ResponseCode'] === '00' && query['vnp_TransactionStatus'] === '00') {
      await activateInvoice(
        orderId,
        query['vnp_TransactionNo'],
        'vnpay',
        Number(query['vnp_Amount']) / 100,
        query
      );
    } else {
      await pool.query(
        `UPDATE billing_invoices SET status = 'failed', gateway_response = $1
         WHERE gateway_order_id = $2 AND payment_gateway = 'vnpay' AND status = 'pending'`,
        [JSON.stringify(query), orderId]
      );
    }
    return res.status(200).json({ RspCode: '00', Message: 'Success' });
  } catch (error) {
    logger.error(error, '[Billing] VNPay IPN failed:');
    return res.status(200).json({ RspCode: '99', Message: 'Retry later' });
  }
};

// ─── POST /api/billing/webhook/momo ─────────────────────────────────────────
export const handleMoMoWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const isValid = verifyMoMoSignature(body) && body.partnerCode === process.env.MOMO_PARTNER_CODE;

    if (!isValid) return res.status(400).json({ error: 'Invalid signature' });

    if (body.resultCode === 0) {
      await activateInvoice(body.orderId, String(body.transId), 'momo', Number(body.amount), body);
      return res.json({ status: 'success' });
    } else {
      await pool.query(
        `UPDATE billing_invoices SET status = 'failed', gateway_response = $1
         WHERE gateway_order_id = $2 AND payment_gateway = 'momo' AND status = 'pending'`,
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

export const getBillingInvoiceStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await pool.query(
      `SELECT id, gateway_order_id, status, paid_at, plan_id
       FROM billing_invoices WHERE tenant_id = $1 AND gateway_order_id = $2`,
      [tenantId, req.params.orderId]
    );
    if (result.rows.length === 0)
      throw new NotFoundError('Invoice not found', ERROR_CODES.INVOICE_NOT_FOUND);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// ─── Helper: Kích hoạt gói sau khi thanh toán thành công ────────────────────
async function activateInvoice(
  orderId: string,
  transactionId: string,
  gateway: 'vnpay' | 'momo',
  paidAmount: number,
  gatewayResponse: any
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lấy invoice
    const invoiceResult = await client.query(
      `SELECT * FROM billing_invoices WHERE gateway_order_id = $1 FOR UPDATE`,
      [orderId]
    );
    if (invoiceResult.rows.length === 0)
      throw new Error(`Invoice not found for orderId: ${orderId}`);
    const invoice = invoiceResult.rows[0];

    if (
      invoice.payment_gateway !== gateway ||
      invoice.currency !== 'VND' ||
      !Number.isFinite(paidAmount) ||
      Number(invoice.amount) !== paidAmount
    ) {
      throw new ValidationError('Payment does not match invoice', ERROR_CODES.PAYMENT_MISMATCH);
    }

    // Idempotency guard: nếu đã thanh toán rồi thì bỏ qua, không xử lý lại
    if (invoice.status === 'paid') {
      await client.query('COMMIT');
      logger.info(`[Billing] Invoice ${invoice.id} already paid — skipping duplicate webhook.`);
      return;
    }
    if (invoice.status !== 'pending') {
      throw new ValidationError('Invoice is no longer pending', ERROR_CODES.INVOICE_NOT_PENDING);
    }

    const tenantResult = await client.query(
      `SELECT plan_id, plan_expires_at FROM tenants WHERE id = $1 FOR UPDATE`,
      [invoice.tenant_id]
    );
    const latestPaid = await client.query(
      `SELECT created_at FROM billing_invoices
       WHERE tenant_id = $1 AND status = 'paid'
       ORDER BY created_at DESC LIMIT 1`,
      [invoice.tenant_id]
    );
    const isOlderInvoice =
      latestPaid.rows.length > 0 &&
      new Date(latestPaid.rows[0].created_at) > new Date(invoice.created_at);
    const currentTenant = tenantResult.rows[0];
    const baseTime =
      currentTenant?.plan_id === invoice.plan_id && currentTenant.plan_expires_at
        ? Math.max(Date.now(), new Date(currentTenant.plan_expires_at).getTime())
        : Date.now();
    const expiresAt = new Date(baseTime + 30 * 24 * 60 * 60 * 1000);

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
    if (!isOlderInvoice) {
      await client.query(
        `UPDATE tenants SET plan_id = $1, plan_expires_at = $2, updated_at = NOW() WHERE id = $3`,
        [invoice.plan_id, expiresAt, invoice.tenant_id]
      );
    }

    // Hủy các plan_request pending nếu có
    await client.query(
      `UPDATE plan_requests SET status = 'approved', updated_at = NOW()
       WHERE tenant_id = $1 AND plan_id = $2 AND status = 'pending'`,
      [invoice.tenant_id, invoice.plan_id]
    );

    await client.query('COMMIT');
    logger.info(
      `[Billing] Invoice ${invoice.id} paid. Tenant ${invoice.tenant_id} upgraded to plan ${invoice.plan_id}`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(err, '[Billing] activateInvoice error:');
    throw err;
  } finally {
    client.release();
  }
}
