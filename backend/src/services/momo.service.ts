import crypto from 'crypto';
import axios from 'axios';

interface MoMoParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  returnUrl: string;
  notifyUrl: string;
  requestId?: string;
}

interface MoMoResponse {
  payUrl: string;
  orderId: string;
  requestId: string;
  resultCode: number;
  message: string;
}

export const createMoMoUrl = async (params: MoMoParams): Promise<MoMoResponse> => {
  const partnerCode = process.env.MOMO_PARTNER_CODE!;
  const accessKey = process.env.MOMO_ACCESS_KEY!;
  const secretKey = process.env.MOMO_SECRET_KEY!;
  const momoEndpoint =
    process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';

  const requestId = params.requestId || `${partnerCode}${Date.now()}`;
  const requestType = 'captureWallet';
  const extraData = '';
  const autoCapture = true;
  const lang = 'vi';

  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${params.amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${params.notifyUrl}`,
    `orderId=${params.orderId}`,
    `orderInfo=${params.orderInfo}`,
    `partnerCode=${partnerCode}`,
    `redirectUrl=${params.returnUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join('&');

  const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

  const requestBody = {
    partnerCode,
    accessKey,
    requestId,
    amount: params.amount,
    orderId: params.orderId,
    orderInfo: params.orderInfo,
    redirectUrl: params.returnUrl,
    ipnUrl: params.notifyUrl,
    lang,
    requestType,
    autoCapture,
    extraData,
    signature,
  };

  const response = await axios.post(momoEndpoint, requestBody, {
    headers: { 'Content-Type': 'application/json' },
  });

  return response.data;
};

export const verifyMoMoSignature = (body: Record<string, any>): boolean => {
  const secretKey = process.env.MOMO_SECRET_KEY!;
  const accessKey = process.env.MOMO_ACCESS_KEY!;

  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${body.amount}`,
    `extraData=${body.extraData}`,
    `message=${body.message}`,
    `orderId=${body.orderId}`,
    `orderInfo=${body.orderInfo}`,
    `orderType=${body.orderType}`,
    `partnerCode=${body.partnerCode}`,
    `payType=${body.payType}`,
    `requestId=${body.requestId}`,
    `responseTime=${body.responseTime}`,
    `resultCode=${body.resultCode}`,
    `transId=${body.transId}`,
  ].join('&');

  const expected = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
  return expected === body.signature;
};
