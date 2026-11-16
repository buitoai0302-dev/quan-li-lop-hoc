import React from 'react';
import { useForm } from 'react-hook-form';
import { Modal, FormPanelActions, Input, Select } from '@/components/common/UI';
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
  backLabel?: string;
}

const PAYMENT_AMOUNT_STEP_VND = 0.01;

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

const PaymentModal: React.FC<Props> = ({ tuition, onClose, backLabel }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const closePanel = () => setIsOpen(false);
  const fieldPrefix = React.useId();
  const { t } = useTranslation();
  const formId = React.useId();
  const remaining = Number((Number(tuition.amount_due) - Number(tuition.amount_paid)).toFixed(2));

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
    if (isPending) return;
    mutate(data, {
      onSuccess: closePanel,
      onError: (err) => handleApiError(err as AxiosError<ApiErrorData>, t),
    });
  };

  // eslint-disable-next-line react-hooks/incompatible-library
  const paymentMethod = watch('payment_method');

  return (
    <Modal
      isOpen={isOpen}
      onClose={closePanel}
      onAfterClose={onClose}
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
          cancelLabel={backLabel}
          isSubmitting={isPending}
          submitLabel={t('tuition.payment.submit')}
          submittingLabel={t('tuition.payment.submitting')}
        />
      )}
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{tuition.student_name}</p>
      {/* Info */}
      <div className="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-slate-800 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 sm:text-center">
        <div className="flex items-center justify-between gap-3 sm:block">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {t('tuition.payment.amountDue')}
          </div>
          <div className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
            {formatCurrency(tuition.amount_due)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:block">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {t('tuition.payment.amountPaid')}
          </div>
          <div className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {formatCurrency(tuition.amount_paid)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:block">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {t('tuition.payment.remaining')}
          </div>
          <div className="text-sm font-semibold tabular-nums text-rose-700 dark:text-rose-300">
            {formatCurrency(remaining)}
          </div>
        </div>
      </div>

      {/* Form */}
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor={fieldPrefix + '-amount_paid'}
            className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {t('tuition.payment.amount')} *
          </label>
          <Input
            aria-invalid={!!errors.amount_paid}
            aria-describedby={errors.amount_paid ? fieldPrefix + '-amount_paid-error' : undefined}
            id={fieldPrefix + '-amount_paid'}
            type="number"
            inputMode="decimal"
            min={PAYMENT_AMOUNT_STEP_VND}
            max={remaining}
            step={PAYMENT_AMOUNT_STEP_VND}
            {...register('amount_paid', {
              valueAsNumber: true,
              required: t('tuition.payment.amountRequired'),
              min: { value: PAYMENT_AMOUNT_STEP_VND, message: t('errors.INVALID_AMOUNT') },
            })}
            className="min-w-0 text-base tabular-nums sm:text-sm"
          />
          {errors.amount_paid && (
            <p id={fieldPrefix + '-amount_paid-error'} className="form-field-error">
              {errors.amount_paid.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="payment-date"
              className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {t('tuition.receipt.date')}
            </label>
            <Input
              id="payment-date"
              type="date"
              {...register('payment_date')}
              className="min-w-0 text-base sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="payment-method"
              className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {t('tuition.payment.method')}
            </label>
            <Select
              id="payment-method"
              {...register('payment_method')}
              className="min-w-0 text-base sm:text-sm"
            >
              {getPaymentMethods(t).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {(paymentMethod === PAYMENT_METHODS.BANK_TRANSFER ||
          paymentMethod === PAYMENT_METHODS.VNPAY ||
          paymentMethod === PAYMENT_METHODS.MOMO) && (
          <div>
            <label
              htmlFor="payment-reference"
              className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {t('tuition.payment.reference')}
            </label>
            <Input
              id="payment-reference"
              type="text"
              {...register('reference_code')}
              placeholder="TXN1234567890"
              spellCheck={false}
              className="min-w-0 text-base sm:text-sm"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="payment-notes"
            className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {t('tuition.bulk.notes')}
          </label>
          <Input
            id="payment-notes"
            type="text"
            {...register('notes')}
            placeholder={t('tuition.bulk.notesPlaceholder')}
            className="min-w-0 text-base sm:text-sm"
          />
        </div>
      </form>
    </Modal>
  );
};

export default PaymentModal;
