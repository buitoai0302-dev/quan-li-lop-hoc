import crypto from 'crypto';

// Format date as yyyyMMddHHmmss (VNPay required format)
const formatVNDate = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join('');
};

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

  // Sort params alphabetically
  const sortedKeys = Object.keys(vnpParams).sort();
  const queryString = sortedKeys
    .map((key) => `${key}=${encodeURIComponent(vnpParams[key]).replace(/%20/g, '+')}`)
    .join('&');

  const hmac = crypto.createHmac('sha512', vnp_HashSecret);
  const signData = sortedKeys.map((key) => `${key}=${vnpParams[key]}`).join('&');
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return `${vnp_Url}?${queryString}&vnp_SecureHash=${signed}`;
};

export const verifyVNPayReturn = (query: Record<string, string>): boolean => {
  const vnp_HashSecret = process.env.VNPAY_HASH_SECRET!;
  const secureHash = query['vnp_SecureHash'];

  const queryClone = { ...query };
  delete queryClone['vnp_SecureHash'];
  delete queryClone['vnp_SecureHashType'];

  const sortedKeys = Object.keys(queryClone).sort();
  const signData = sortedKeys.map((key) => `${key}=${queryClone[key]}`).join('&');

  const hmac = crypto.createHmac('sha512', vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return signed === secureHash;
};
