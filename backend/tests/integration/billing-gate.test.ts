import request from 'supertest';
import express from 'express';
import billingRoutes from '../../src/routes/billing.routes';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import pool from '../../src/db';
import { createVNPayUrl } from '../../src/services/vnpay.service';
import { createMoMoUrl } from '../../src/services/momo.service';

jest.mock('../../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock('../../src/services/vnpay.service');
jest.mock('../../src/services/momo.service');

jest.mock('../../src/middlewares/auth.middleware', () => {
  const actual = jest.requireActual<typeof import('../../src/middlewares/auth.middleware')>(
    '../../src/middlewares/auth.middleware'
  );
  return {
    ...actual,
    authMiddleware: (req: any, _res: any, next: any) => {
      req.user = { userId: 'admin-a', tenantId: 'tenant-a', role: 'admin' };
      next();
    },
  };
});

const app = express();
app.use(express.json());
app.use('/api/billing', billingRoutes);
app.use(errorMiddleware);

describe('Online billing release gate', () => {
  const query = jest.mocked(pool.query);
  const planId = '11111111-1111-4111-8111-111111111111';
  const createPayment = (gateway: string) =>
    request(app).post('/api/billing/create-payment-url').send({ plan_id: planId, gateway });
  const previous = process.env.ONLINE_PAYMENTS_ENABLED;
  afterAll(() => {
    if (previous === undefined) delete process.env.ONLINE_PAYMENTS_ENABLED;
    else process.env.ONLINE_PAYMENTS_ENABLED = previous;
  });

  it('rejects payment creation until sandbox verification enables it', async () => {
    delete process.env.ONLINE_PAYMENTS_ENABLED;
    const response = await createPayment('vnpay');
    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it.each(['vnpay', 'momo'])('uses price_vnd for the invoice and %s', async (gateway) => {
    process.env.ONLINE_PAYMENTS_ENABLED = 'true';
    query.mockResolvedValueOnce({ rows: [{ name: 'Pro', price_vnd: '499000', price_monthly: null }] } as never);
    query.mockResolvedValueOnce({ rows: [{ id: 'invoice-id' }] } as never);
    jest.mocked(createVNPayUrl).mockReturnValue('https://gateway.example.test');
    jest.mocked(createMoMoUrl).mockResolvedValue({
      resultCode: 0, payUrl: 'https://gateway.example.test',
      orderId: 'test-order', requestId: 'test-request', message: 'Success',
    });

    const response = await createPayment(gateway);
    expect(response.status).toBe(200);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO billing_invoices'),
      ['tenant-a', planId, 499000, gateway, response.body.orderId]);
    expect(gateway === 'vnpay' ? createVNPayUrl : createMoMoUrl).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 499000, orderId: response.body.orderId })
    );
  });

  it('rejects a zero price and an unsupported gateway before creating an invoice', async () => {
    process.env.ONLINE_PAYMENTS_ENABLED = 'true';
    const unsupported = await createPayment('stripe');
    expect(unsupported.body.code).toBe('UNSUPPORTED_GATEWAY');
    expect(query).not.toHaveBeenCalled();

    query.mockResolvedValueOnce({ rows: [{ name: 'Free', price_vnd: '0' }] } as never);
    const free = await createPayment('vnpay');
    expect(free.body.code).toBe('ZERO_AMOUNT');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
