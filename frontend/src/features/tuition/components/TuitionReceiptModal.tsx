import React, { useEffect, useRef } from 'react';
import { X, Printer, CheckCircle2, Clock } from 'lucide-react';
import type { Tuition } from '../api/tuition.api';
import { useTuitionPayments } from '../hooks/useTuition';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { PAYMENT_METHODS, TUITION_STATUS } from '@/utils/constants';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { useDialogFocus } from '@/components/common/UI/useDialogFocus';

import toast from 'react-hot-toast';
import receiptPrintCss from './tuition-receipt-print.css?raw';

interface Props {
  tuition: Tuition;
  onClose: () => void;
}

const getPaymentMethodLabels = (t: import('i18next').TFunction): Record<string, string> => ({
  [PAYMENT_METHODS.CASH]: t('tuition.paymentMethods.cash'),
  [PAYMENT_METHODS.BANK_TRANSFER]: t('tuition.paymentMethods.bank_transfer'),
  [PAYMENT_METHODS.MOMO]: t('tuition.paymentMethods.momo'),
  [PAYMENT_METHODS.VNPAY]: t('tuition.paymentMethods.vnpay'),
  [PAYMENT_METHODS.STRIPE]: t('tuition.paymentMethods.stripe'),
  [PAYMENT_METHODS.OTHER]: t('tuition.paymentMethods.other'),
});

const TuitionReceiptModal: React.FC<Props> = ({ tuition, onClose }) => {
  const dialogRef = useDialogFocus(onClose);
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const receiptRef = useRef<HTMLDivElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const { data: payments = [], isPending, isError, refetch } = useTuitionPayments(tuition.id);
  const locale = i18n.resolvedLanguage || i18n.language;
  const paymentMethodLabels = getPaymentMethodLabels(t);
  const remaining = Number(tuition.amount_due) - Number(tuition.amount_paid);

  useEffect(() => () => printFrameRef.current?.remove(), []);

  const handlePrint = () => {
    const receipt = receiptRef.current;
    if (!receipt || isPending || isError) return;

    printFrameRef.current?.remove();
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText =
      'position:fixed;bottom:0;right:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(frame);
    printFrameRef.current = frame;

    const removeFrame = () => {
      frame.remove();
      if (printFrameRef.current === frame) printFrameRef.current = null;
    };

    try {
      const printWindow = frame.contentWindow;
      const printDocument = frame.contentDocument;
      if (!printWindow || !printDocument) throw new Error('Print document is unavailable');

      printDocument.documentElement.lang = locale;
      printDocument.title = t('tuition.receipt.documentTitle', { student: tuition.student_name });
      const style = printDocument.createElement('style');
      style.textContent = receiptPrintCss;
      printDocument.head.appendChild(style);
      printDocument.body.appendChild(printDocument.importNode(receipt, true));
      printWindow.addEventListener('afterprint', removeFrame, { once: true });
      printWindow.focus();
      printWindow.print();
    } catch {
      removeFrame();
      toast.error(t('tuition.receipt.printError'));
    }
  };

  const statusClass =
    {
      [TUITION_STATUS.PAID]: 'status-paid',
      [TUITION_STATUS.PARTIAL]: 'status-partial',
      [TUITION_STATUS.UNPAID]: 'status-unpaid',
      [TUITION_STATUS.OVERDUE]: 'status-overdue',
      [TUITION_STATUS.WAIVED]: 'status-paid',
    }[tuition.status] || 'status-unpaid';

  const statusLabel =
    {
      [TUITION_STATUS.PAID]: t('tuition.statusLabels.paid'),
      [TUITION_STATUS.PARTIAL]: t('tuition.statusLabels.partial'),
      [TUITION_STATUS.UNPAID]: t('tuition.statusLabels.unpaid'),
      [TUITION_STATUS.OVERDUE]: t('tuition.statusLabels.overdue'),
      [TUITION_STATUS.WAIVED]: t('tuition.statusLabels.waived'),
    }[tuition.status] || tuition.status;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-dialog-title"
        tabIndex={-1}
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-slate-700 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-5 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <h2
            id="receipt-dialog-title"
            className="text-base font-black text-gray-900 dark:text-white"
          >
            {t('tuition.receipt.title')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPending || isError}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary font-bold text-sm rounded-xl hover:bg-primary/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={16} /> {t('tuition.receipt.print')}
            </button>
            <button
              type="button"
              aria-label={t('common.close', 'Đóng')}
              onClick={onClose}
              className="min-h-11 min-w-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {isPending && (
          <p role="status" className="px-5 pt-3 text-sm">
            {t('tuition.receipt.loadingPayments')}
          </p>
        )}
        {isError && (
          <div role="alert" className="px-5 pt-3 text-sm text-rose-600 dark:text-rose-400">
            {t('tuition.receipt.loadPaymentsError')}{' '}
            <button type="button" className="underline" onClick={() => void refetch()}>
              {t('tuition.receipt.retry')}
            </button>
          </div>
        )}

        {/* Receipt Content */}
        <div className="flex-1 overflow-auto p-5">
          <div ref={receiptRef} className="tuition-receipt">
            {/* Receipt Header */}
            <div className="receipt-header text-center mb-6 pb-4 border-b-2 border-gray-200">
              <h1 className="break-words text-xl font-black text-blue-700 dark:text-blue-300">
                {user?.tenant_name || 'EduSchedule'}
              </h1>
              <p className="text-xs text-gray-500 mt-1">{t('tuition.receipt.receiptSubtitle')}</p>
              <p className="text-xs text-gray-400">
                {t('tuition.receipt.printDate', { date: formatDate(new Date(), locale) })}
              </p>
            </div>

            {/* Student Info */}
            <div className="receipt-details space-y-2 mb-4">
              {[
                [t('tuition.student'), tuition.student_name],
                [t('tuition.bulk.class'), tuition.class_name || '—'],
                [t('tuition.bulk.period'), tuition.billing_period || '—'],
                [t('tuition.dueDate'), formatDate(tuition.due_date, locale)],
              ].map(([label, value]) => (
                <div key={label} className="receipt-row flex justify-between gap-3 text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="min-w-0 break-words text-right font-bold text-gray-900 dark:text-white">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="receipt-divider border-t border-dashed border-gray-200 my-4" />

            {/* Amount */}
            <div className="receipt-amount bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 mb-4">
              <div className="receipt-row flex justify-between gap-3 text-sm mb-1">
                <span className="text-gray-500">{t('tuition.amount')}</span>
                <span className="font-semibold">{formatCurrency(tuition.amount)}</span>
              </div>
              {tuition.discount > 0 && (
                <div className="receipt-row flex justify-between gap-3 text-sm mb-1">
                  <span className="text-gray-500">{t('tuition.discount')}</span>
                  <span className="font-semibold text-emerald-600">
                    -{formatCurrency(tuition.discount)}
                  </span>
                </div>
              )}
              <div className="receipt-row receipt-total flex justify-between gap-3 font-black text-lg text-emerald-700 border-t border-emerald-200 pt-2 mt-2">
                <span>{t('tuition.payment.amountDue')}</span>
                <span>{formatCurrency(tuition.amount_due)}</span>
              </div>
              <div className="receipt-row flex justify-between gap-3 text-sm mt-1">
                <span className="text-gray-500">{t('tuition.payment.amountPaid')}</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(tuition.amount_paid)}
                </span>
              </div>
              {remaining > 0 && (
                <div className="receipt-row flex justify-between gap-3 text-sm mt-1">
                  <span className="text-gray-500">{t('tuition.payment.remaining')}</span>
                  <span className="font-bold text-rose-500">{formatCurrency(remaining)}</span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="receipt-status flex justify-center mb-4">
              <span
                className={`status-badge ${statusClass} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider`}
              >
                {tuition.status === TUITION_STATUS.PAID ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <Clock size={12} />
                )}
                {statusLabel}
              </span>
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <>
                <div className="receipt-divider border-t border-dashed border-gray-200 my-4" />
                <div className="receipt-history-title text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                  {t('tuition.receipt.paymentHistory')}
                </div>
                <table className="receipt-payment-table w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800">
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500">
                        {t('tuition.receipt.date')}
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500">
                        {t('tuition.receipt.method')}
                      </th>
                      <th className="px-2 py-2 text-right text-xs font-bold text-gray-500">
                        {t('tuition.receipt.amount')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50 dark:border-slate-800">
                        <td className="px-2 py-2 text-xs">{formatDate(p.payment_date, locale)}</td>
                        <td className="px-2 py-2 text-xs">
                          {paymentMethodLabels[p.payment_method] || p.payment_method}
                        </td>
                        <td className="px-2 py-2 text-xs text-right font-bold text-emerald-600">
                          {formatCurrency(p.amount_paid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="receipt-footer text-center mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
              <p>{t('tuition.receipt.thanks')}</p>
              <p className="mt-1">{t('tuition.receipt.poweredBy')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TuitionReceiptModal;
