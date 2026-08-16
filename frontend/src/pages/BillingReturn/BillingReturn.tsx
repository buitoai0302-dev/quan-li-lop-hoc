import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BillingReturn: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Both MoMo and VNPay redirect to this frontend page after processing.
    // They pass parameters in the URL.
    // VNPay usually has vnp_ResponseCode
    // MoMo usually has resultCode
    const urlStatus = searchParams.get('status');
    const vnpResponse = searchParams.get('vnp_ResponseCode');
    const momoResult = searchParams.get('resultCode');
    const customMessage = searchParams.get('message');

    if (urlStatus === 'success') {
      setStatus('success');
    } else if (urlStatus === 'failed' || urlStatus === 'error') {
      setStatus(urlStatus as 'failed' | 'error');
      setMessage(customMessage || 'Thanh toán không thành công');
    } else if (vnpResponse) {
      if (vnpResponse === '00') {
        setStatus('success');
      } else {
        setStatus('failed');
        setMessage(`Mã lỗi VNPay: ${vnpResponse}`);
      }
    } else if (momoResult) {
      if (momoResult === '0') {
        setStatus('success');
      } else {
        setStatus('failed');
        setMessage(`Mã lỗi MoMo: ${momoResult}`);
      }
    } else {
      // Missing params, wait a bit or show error
      setStatus('error');
      setMessage('Không tìm thấy kết quả giao dịch hợp lệ.');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-3xl shadow-xl p-8 text-center border border-gray-100 dark:border-slate-700">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-primary animate-spin" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('billingReturn.processing')}
            </h2>
            <p className="text-gray-500 text-sm">{t('billingReturn.wait')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {t('billingReturn.successTitle')}
            </h2>
            <p className="text-gray-500 text-sm">{t('billingReturn.successDesc')}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 w-full py-3 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              {t('billingReturn.homeBtn')}
            </button>
          </div>
        )}

        {(status === 'failed' || status === 'error') && (
          <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-2">
              <XCircle size={40} className="text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {t('billingReturn.failedTitle')}
            </h2>
            <p className="text-rose-600 dark:text-rose-400 font-semibold">{message}</p>
            <p className="text-gray-500 text-sm">{t('billingReturn.failedDesc')}</p>
            <button
              onClick={() => navigate('/subscription')}
              className="mt-4 w-full py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('billingReturn.backBtn')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingReturn;
