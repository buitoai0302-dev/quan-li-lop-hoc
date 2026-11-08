import crypto from 'crypto';
import { createVNPayUrl, verifyVNPayReturn } from '../../src/services/vnpay.service';

describe('VNPay HMAC SHA-512', () => {
  const previous = {
    VNPAY_TMN_CODE: process.env.VNPAY_TMN_CODE,
    VNPAY_HASH_SECRET: process.env.VNPAY_HASH_SECRET,
  };
  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = 'TEST1234';
    process.env.VNPAY_HASH_SECRET = 'test-secret';
  });
  afterAll(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('signs the encoded sorted payment query and rejects a changed callback amount', () => {
    const url = new URL(createVNPayUrl({
      orderId: 'INV-TEST', amount: 120000, orderInfo: 'Pilot payment',
      returnUrl: 'https://api.example.test/api/billing/webhook/vnpay', ipAddr: '127.0.0.1',
    }));
    const signature = url.searchParams.get('vnp_SecureHash');
    url.searchParams.delete('vnp_SecureHash');
    url.searchParams.sort();
    const expected = crypto.createHmac('sha512', 'test-secret')
      .update(url.searchParams.toString()).digest('hex');
    expect(signature).toBe(expected);

    const callback = Object.fromEntries(url.searchParams.entries());
    callback.vnp_ResponseCode = '00';
    callback.vnp_TransactionStatus = '00';
    callback.vnp_TransactionNo = '123';
    const signed = new URLSearchParams(callback);
    signed.sort();
    callback.vnp_SecureHash = crypto.createHmac('sha512', 'test-secret')
      .update(signed.toString()).digest('hex');
    expect(verifyVNPayReturn(callback)).toBe(true);
    callback.vnp_Amount = '1';
    expect(verifyVNPayReturn(callback)).toBe(false);
  });
});
