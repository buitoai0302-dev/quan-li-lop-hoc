import { Button } from '@/components/common/UI';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getBillingInvoiceStatus } from '../api/subscription.api';

const MAX_STATUS_ATTEMPTS = 10;
const STATUS_POLL_INTERVAL_MS = 3000;

const BillingReturn: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'error'>('loading');
  const [messageKey, setMessageKey] = useState('');
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (!orderId) {
      setStatus('error');
      setMessageKey('billingReturn.missingOrder');
      return;
    }

    setStatus('loading');
    setMessageKey('');
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const checkInvoice = async () => {
      try {
        const invoice = await getBillingInvoiceStatus(orderId);
        if (cancelled) return;
        if (invoice.status === 'paid') {
          setStatus('success');
        } else if (invoice.status !== 'pending') {
          setStatus('failed');
          setMessageKey('billingReturn.paymentFailed');
        } else if (++attempts < MAX_STATUS_ATTEMPTS) {
          timer = setTimeout(checkInvoice, STATUS_POLL_INTERVAL_MS);
        } else {
          setStatus('error');
          setMessageKey('billingReturn.pendingConfirmation');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessageKey('billingReturn.statusUnavailable');
        }
      }
    };
    void checkInvoice();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchParams, retryAttempt]);

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-gray-50 dark:bg-slate-900 flex p-4">
      <div className="m-auto shrink-0 bg-white dark:bg-slate-800 max-w-md w-full rounded-3xl shadow-xl p-8 text-center border border-gray-100 dark:border-slate-700">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-primary animate-spin" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('billingReturn.processing')}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm">{t('billingReturn.wait')}</p>
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
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t('billingReturn.successDesc')}
            </p>
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
              {t(
                status === 'failed' ? 'billingReturn.failedTitle' : 'billingReturn.unconfirmedTitle'
              )}
            </h2>
            <p className="text-rose-600 dark:text-rose-400 font-semibold">{t(messageKey)}</p>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t(
                status === 'failed'
                  ? 'billingReturn.failedDesc'
                  : 'billingReturn.unconfirmedDescription'
              )}
            </p>
            {status === 'error' && searchParams.get('orderId') && (
              <Button
                type="button"
                className="w-full"
                onClick={() => setRetryAttempt((attempt) => attempt + 1)}
              >
                {t('common.retry')}
              </Button>
            )}
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
