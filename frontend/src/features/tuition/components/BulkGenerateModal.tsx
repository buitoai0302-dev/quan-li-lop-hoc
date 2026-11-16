import React from 'react';
import { useForm } from 'react-hook-form';
import { Modal, FormPanelActions } from '@/components/common/UI';
import { useBulkGenerateTuitions } from '../hooks/useTuition';
import type { BulkGenerateDto } from '../api/tuition.api';
import { handleApiError } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';
import { useTranslation } from 'react-i18next';
import { useClasses } from '@/features/classes/hooks/useClasses';
import { BILLING_CYCLE } from '@/utils/constants';

interface Props {
  onClose: () => void;
}

const BulkGenerateModal: React.FC<Props> = ({ onClose }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const closePanel = () => setIsOpen(false);
  const fieldPrefix = React.useId();
  const { t } = useTranslation();
  const formId = React.useId();
  const { classes } = useClasses();
  const { mutate, isPending } = useBulkGenerateTuitions();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BulkGenerateDto>({
    defaultValues: {
      billing_cycle: BILLING_CYCLE.MONTHLY,
      skip_existing: true,
      discount: 0,
    },
  });

  // Generate billing_period options (current month + 5 previous)
  const periodOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const onSubmit = (data: BulkGenerateDto) => {
    mutate(data, {
      onSuccess: closePanel,
      onError: (err) => handleApiError(err as AxiosError<ApiErrorData>, t),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closePanel}
      onAfterClose={onClose}
      placement="right"
      width="clamp(480px, 44vw, 560px)"
      title={t('tuition.bulk.title')}
      closeLabel={t('common.close')}
      closeBlocked={isPending}
      confirmCloseMessage={t('common.discardPanelChanges')}
      footer={(requestClose) => (
        <FormPanelActions
          formId={formId}
          onCancel={requestClose}
          isSubmitting={isPending}
          submitLabel={t('tuition.bulk.submit')}
          submittingLabel={t('tuition.bulk.submitting')}
        />
      )}
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('tuition.bulk.subtitle')}</p>
      {/* Form */}
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor={fieldPrefix + '-class_id'}
            className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {t('tuition.bulk.class')} *
          </label>
          <select
            aria-invalid={!!errors.class_id}
            aria-describedby={errors.class_id ? fieldPrefix + '-class_id-error' : undefined}
            id={fieldPrefix + '-class_id'}
            {...register('class_id', { required: t('tuition.bulk.classRequired') })}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t('tuition.bulk.selectClass')}</option>
            {classes.map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.class_id && (
            <p id={fieldPrefix + '-class_id-error'} className="form-field-error">
              {errors.class_id.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={fieldPrefix + '-billing_period'}
              className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {t('tuition.bulk.period')} *
            </label>
            <select
              aria-invalid={!!errors.billing_period}
              aria-describedby={
                errors.billing_period ? fieldPrefix + '-billing_period-error' : undefined
              }
              id={fieldPrefix + '-billing_period'}
              {...register('billing_period', { required: t('tuition.bulk.periodRequired') })}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">{t('tuition.bulk.selectPeriod')}</option>
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {errors.billing_period && (
              <p id={fieldPrefix + '-billing_period-error'} className="form-field-error">
                {errors.billing_period.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor={fieldPrefix + '-due_date'}
              className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {t('tuition.bulk.dueDate')} *
            </label>
            <input
              aria-invalid={!!errors.due_date}
              aria-describedby={errors.due_date ? fieldPrefix + '-due_date-error' : undefined}
              id={fieldPrefix + '-due_date'}
              type="date"
              {...register('due_date', { required: t('tuition.bulk.dueDateRequired') })}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {errors.due_date && (
              <p id={fieldPrefix + '-due_date-error'} className="form-field-error">
                {errors.due_date.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={fieldPrefix + '-amount'}
              className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {t('tuition.bulk.amount')} *
            </label>
            <input
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? fieldPrefix + '-amount-error' : undefined}
              id={fieldPrefix + '-amount'}
              type="number"
              min={0}
              {...register('amount', { required: t('tuition.bulk.amountRequired'), min: 1 })}
              placeholder="1,500,000"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {errors.amount && (
              <p id={fieldPrefix + '-amount-error'} className="form-field-error">
                {errors.amount.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor={fieldPrefix + '-discount'}
              className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {t('tuition.bulk.discount')}
            </label>
            <input
              id={fieldPrefix + '-discount'}
              type="number"
              min={0}
              {...register('discount')}
              placeholder="0"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={fieldPrefix + '-notes'}
            className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {t('tuition.bulk.notes')}
          </label>
          <input
            id={fieldPrefix + '-notes'}
            type="text"
            {...register('notes')}
            placeholder={t('tuition.bulk.notesPlaceholder')}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <label className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            {...register('skip_existing')}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium">{t('tuition.bulk.skipExisting')}</span>
        </label>
      </form>
    </Modal>
  );
};

export default BulkGenerateModal;
