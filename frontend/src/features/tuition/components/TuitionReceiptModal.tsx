import React, { useRef } from 'react';
import { X, Printer, CheckCircle2, Clock } from 'lucide-react';
import type { Tuition } from '../api/tuition.api';
import { useTuitionPayments } from '../hooks/useTuition';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface Props {
  tuition: Tuition;
  onClose: () => void;
}

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));

const getPaymentMethodLabels = (t: any) => ({
  cash: t('tuition.paymentMethods.cash'),
  bank_transfer: t('tuition.paymentMethods.bank_transfer'),
  momo: t('tuition.paymentMethods.momo'),
  vnpay: t('tuition.paymentMethods.vnpay'),
  stripe: t('tuition.paymentMethods.stripe'),
  other: t('tuition.paymentMethods.other'),
});

const TuitionReceiptModal: React.FC<Props> = ({ tuition, onClose }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const receiptRef = useRef<HTMLDivElement>(null);
  const { data: payments = [] } = useTuitionPayments(tuition.id);

  const remaining = Number(tuition.amount_due) - Number(tuition.amount_paid);

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML || '';
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (!win) {
      document.body.removeChild(iframe);
      return;
    }
    win.document.write(`
      <html>
      <head>
        <title>${t('tuition.receipt.title')} - ${tuition.student_name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Arial', sans-serif; padding: 20px; color: #1a1a1a; }
          .receipt { max-width: 480px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
          .header h1 { font-size: 20px; font-weight: 900; color: #1e40af; margin-bottom: 4px; }
          .header p { font-size: 12px; color: #6b7280; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .info-row .label { color: #6b7280; }
          .info-row .value { font-weight: 700; }
          .divider { border-top: 1px dashed #e5e7eb; margin: 16px 0; }
          .amount-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 16px 0; }
          .total { font-size: 18px; font-weight: 900; color: #15803d; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
          .status-paid { background: #dcfce7; color: #15803d; }
          .status-partial { background: #fef9c3; color: #a16207; }
          .status-unpaid, .status-overdue { background: #fee2e2; color: #dc2626; }
          .payment-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
          .payment-table th { text-align: left; padding: 6px; background: #f9fafb; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb; }
          .payment-table td { padding: 6px; border-bottom: 1px solid #f3f4f6; }
          .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #9ca3af; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${printContent}</body>
      </html>
    `);
    win.document.close();
    win.focus();

    // Some browsers need a slight delay to render
    setTimeout(() => {
      win.print();
      // Remove the iframe after a delay to ensure print dialog opened
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  const statusClass =
    {
      paid: 'status-paid',
      partial: 'status-partial',
      unpaid: 'status-unpaid',
      overdue: 'status-overdue',
      waived: 'status-paid',
    }[tuition.status] || 'status-unpaid';

  const statusLabel =
    {
      paid: t('tuition.statusLabels.paid'),
      partial: t('tuition.statusLabels.partial'),
      unpaid: t('tuition.statusLabels.unpaid'),
      overdue: t('tuition.statusLabels.overdue'),
      waived: t('tuition.statusLabels.waived'),
    }[tuition.status] || tuition.status;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-slate-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <h2 className="text-base font-black text-gray-900 dark:text-white">
            {t('tuition.receipt.title')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary font-bold text-sm rounded-xl hover:bg-primary/20 transition-colors"
            >
              <Printer size={16} /> {t('tuition.receipt.print')}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-auto p-5">
          <div ref={receiptRef} className="receipt">
            {/* Receipt Header */}
            <div className="header text-center mb-6 pb-4 border-b-2 border-gray-200">
              <h1 className="text-xl font-black text-blue-700">
                {user?.tenant_name || 'EduSchedule'}
              </h1>
              <p className="text-xs text-gray-500 mt-1">{t('tuition.receipt.receiptSubtitle')}</p>
              <p className="text-xs text-gray-400">
                {t('tuition.receipt.printDate')}: {new Date().toLocaleDateString('vi-VN')}
              </p>
            </div>

            {/* Student Info */}
            <div className="space-y-2 mb-4">
              {[
                [t('tuition.student'), tuition.student_name],
                [t('tuition.bulk.class'), tuition.class_name || '—'],
                [t('tuition.bulk.period'), tuition.billing_period || '—'],
                [t('tuition.dueDate'), new Date(tuition.due_date).toLocaleDateString('vi-VN')],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{value}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-200 my-4" />

            {/* Amount */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">{t('tuition.amount')}</span>
                <span className="font-semibold">{formatCurrency(tuition.amount)}</span>
              </div>
              {tuition.discount > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">{t('tuition.discount')}</span>
                  <span className="font-semibold text-emerald-600">
                    -{formatCurrency(tuition.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-black text-lg text-emerald-700 border-t border-emerald-200 pt-2 mt-2">
                <span>{t('tuition.payment.amountDue')}</span>
                <span>{formatCurrency(tuition.amount_due)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">{t('tuition.payment.amountPaid')}</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(tuition.amount_paid)}
                </span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">{t('tuition.payment.remaining')}</span>
                  <span className="font-bold text-rose-500">{formatCurrency(remaining)}</span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="flex justify-center mb-4">
              <span
                className={`status-badge ${statusClass} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider`}
              >
                {tuition.status === 'paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {statusLabel}
              </span>
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <>
                <div className="border-t border-dashed border-gray-200 my-4" />
                <div className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                  {t('tuition.receipt.paymentHistory')}
                </div>
                <table className="payment-table w-full text-sm">
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
                        <td className="px-2 py-2 text-xs">
                          {new Date(p.payment_date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {(getPaymentMethodLabels(t) as Record<string, string>)[
                            p.payment_method
                          ] || p.payment_method}
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

            <div className="footer text-center mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
              <p>{t('tuition.receipt.thanks')}</p>
              <p className="mt-1">Powered by EduSchedule</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TuitionReceiptModal;
