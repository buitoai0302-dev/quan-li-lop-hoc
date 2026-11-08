import crypto from 'crypto';

// Format date as yyyyMMddHHmmss (VNPay required format)
const formatVNDate = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return [
    local.getUTCFullYear(),
    pad(local.getUTCMonth() + 1),
    pad(local.getUTCDate()),
    pad(local.getUTCHours()),
    pad(local.getUTCMinutes()),
    pad(local.getUTCSeconds()),
  ].join('');
};

const signedQuery = (params: Record<string, string>): string =>
  Object.keys(params)
    .sort()
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`
    )
    .join('&');

interface VNPayParams {
  orderId: string;
  amount: number; // VND, nguyên
  orderInfo: string;
  returnUrl: string;
  ipAddr: string;
}

export const createVNPayUrl = (params: VNPayParams): string => {
  const vnp_TmnCode = process.env.VNPAY_TMN_CODE!;
  const vnp_HashSecret = process.env.VNPAY_HASH_SECRET!;
  const vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

  const date = new Date();
  const createDate = formatVNDate(date);
  const expireDate = formatVNDate(new Date(date.getTime() + 15 * 60 * 1000));

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.orderId,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'billpayment',
    vnp_Amount: String(params.amount * 100), // VNPay nhân 100
    vnp_ReturnUrl: params.returnUrl,
    vnp_IpAddr: params.ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  const queryString = signedQuery(vnpParams);
  const hmac = crypto.createHmac('sha512', vnp_HashSecret);
  const signed = hmac.update(Buffer.from(queryString, 'utf-8')).digest('hex');

  return `${vnp_Url}?${queryString}&vnp_SecureHash=${signed}`;
};

export const verifyVNPayReturn = (query: Record<string, string>): boolean => {
  const vnp_HashSecret = process.env.VNPAY_HASH_SECRET!;
  const secureHash = query['vnp_SecureHash'];
  if (!secureHash || !/^[a-f0-9]{128}$/i.test(secureHash)) return false;

  const gatewayEntries = Object.entries(query).filter(([key]) => key.startsWith('vnp_'));
  if (gatewayEntries.some(([, value]) => typeof value !== 'string')) return false;

  const signedParams = Object.fromEntries(
    gatewayEntries.filter(([key]) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
  ) as Record<string, string>;

  const hmac = crypto.createHmac('sha512', vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signedQuery(signedParams), 'utf-8')).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signed, 'hex'), Buffer.from(secureHash, 'hex'));
};
