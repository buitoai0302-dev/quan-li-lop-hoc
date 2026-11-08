import React from 'react';
import { useForm } from 'react-hook-form';
import { Modal, FormPanelActions } from '@/components/common/UI';
import { useRecordPayment } from '../hooks/useTuition';
import type { RecordPaymentDto, Tuition } from '../api/tuition.api';
import { handleApiError } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';
import { useTranslation } from 'react-i18next';
import { PAYMENT_METHODS } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';

interface Props {
  tuition: Tuition;
  onClose: () => void;
}

const getPaymentMethods = (t: import('i18next').TFunction) => [
  { value: PAYMENT_METHODS.CASH, label: `💵 ${t('tuition.paymentMethods.cash')}` },
  {
    value: PAYMENT_METHODS.BANK_TRANSFER,
    label: `🏦 ${t('tuition.paymentMethods.bank_transfer')}`,
  },
  { value: PAYMENT_METHODS.MOMO, label: `📱 ${t('tuition.paymentMethods.momo')}` },
  { value: PAYMENT_METHODS.VNPAY, label: `💳 ${t('tuition.paymentMethods.vnpay')}` },
  { value: PAYMENT_METHODS.OTHER, label: `🔧 ${t('tuition.paymentMethods.other')}` },
];

const PaymentModal: React.FC<Props> = ({ tuition, onClose }) => {
  const { t } = useTranslation();
  const formId = React.useId();
  const remaining = Number(tuition.amount_due) - Number(tuition.amount_paid);

  const { mutate, isPending } = useRecordPayment(tuition.id);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RecordPaymentDto>({
    defaultValues: {
      amount_paid: remaining,
      payment_method: PAYMENT_METHODS.CASH,
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = (data: RecordPaymentDto) => {
    mutate(data, {
      onSuccess: onClose,
      onError: (err) => handleApiError(err as AxiosError<ApiErrorData>, t),
    });
  };

  // eslint-disable-next-line react-hooks/incompatible-library
  const paymentMethod = watch('payment_method');

  return (
    <Modal
      isOpen
      onClose={onClose}
      placement="right"
      width="clamp(480px, 44vw, 560px)"
      title={t('tuition.payment.title')}
      closeLabel={t('common.close')}
      closeBlocked={isPending}
      confirmCloseMessage={t('common.discardPanelChanges')}
      footer={(requestClose) => (
        <FormPanelActions
          formId={formId}
          onCancel={requestClose}
          isSubmitting={isPending}
          submitLabel={t('tuition.payment.submit')}
          submittingLabel={t('tuition.payment.submitting')}
        />
      )}
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{tuition.student_name}</p>
      {/* Info */}
      <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[10px] text-gray-400 uppercase font-bold">
            {t('tuition.payment.amountDue')}
          </div>
          <div className="text-sm font-black text-gray-900 dark:text-white">
            {formatCurrency(tuition.amount_due)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase font-bold">
            {t('tuition.payment.amountPaid')}
          </div>
          <div className="text-sm font-black text-emerald-600">
            {formatCurrency(tuition.amount_paid)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase font-bold">
            {t('tuition.payment.remaining')}
          </div>
          <div className="text-sm font-black text-rose-500">{formatCurrency(remaining)}</div>
        </div>
      </div>

      {/* Form */}
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="payment-amount"
            className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
          >
            {t('tuition.payment.amount')} *
          </label>
          <input
            id="payment-amount"
            type="number"
            min={1}
            max={remaining}
            {...register('amount_paid', {
              required: t('tuition.payment.amountRequired'),
              min: { value: 1, message: 'Tối thiểu 1 VNĐ' },
            })}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          {errors.amount_paid && (
            <p className="text-rose-500 text-xs mt-1">{errors.amount_paid.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="payment-date"
              className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
            >
              {t('tuition.receipt.date')}
            </label>
            <input
              id="payment-date"
              type="date"
              {...register('payment_date')}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <div>
            <label
              htmlFor="payment-method"
              className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
            >
              {t('tuition.payment.method')}
            </label>
            <select
              id="payment-method"
              {...register('payment_method')}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {getPaymentMethods(t).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(paymentMethod === PAYMENT_METHODS.BANK_TRANSFER ||
          paymentMethod === PAYMENT_METHODS.VNPAY ||
          paymentMethod === PAYMENT_METHODS.MOMO) && (
          <div>
            <label
              htmlFor="payment-reference"
              className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
            >
              {t('tuition.payment.reference')}
            </label>
            <input
              id="payment-reference"
              type="text"
              {...register('reference_code')}
              placeholder="TXN1234567890"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="payment-notes"
            className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
          >
            {t('tuition.bulk.notes')}
          </label>
          <input
            id="payment-notes"
            type="text"
            {...register('notes')}
            placeholder={t('tuition.bulk.notesPlaceholder')}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </form>
    </Modal>
  );
};

export default PaymentModal;
