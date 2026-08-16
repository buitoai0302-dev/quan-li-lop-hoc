import React from 'react';
import { useForm } from 'react-hook-form';
import { Zap, X, AlertCircle } from 'lucide-react';
import { useBulkGenerateTuitions } from '../hooks/useTuition';
import type { BulkGenerateDto } from '../api/tuition.api';
import { handleApiError } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';
import { useTranslation } from 'react-i18next';
import { useClasses } from '@/features/classes/hooks/useClasses';

interface Props {
  onClose: () => void;
}

const BulkGenerateModal: React.FC<Props> = ({ onClose }) => {
  const { t } = useTranslation();
  const { classes } = useClasses();
  const { mutate, isPending } = useBulkGenerateTuitions();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BulkGenerateDto>({
    defaultValues: {
      billing_cycle: 'monthly',
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
      onSuccess: onClose,
      onError: (err) => handleApiError(err as AxiosError<ApiErrorData>, t),
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Zap size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {t('tuition.bulk.title')}
              </h2>
              <p className="text-xs text-gray-500">{t('tuition.bulk.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {t('tuition.bulk.class')} *
            </label>
            <select
              {...register('class_id', { required: t('tuition.bulk.classRequired') })}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">{t('tuition.bulk.selectClass')}</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.class_id && (
              <p className="text-rose-500 text-xs mt-1">{errors.class_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('tuition.bulk.period')} *
              </label>
              <select
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
                <p className="text-rose-500 text-xs mt-1">{errors.billing_period.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('tuition.bulk.dueDate')} *
              </label>
              <input
                type="date"
                {...register('due_date', { required: t('tuition.bulk.dueDateRequired') })}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {errors.due_date && (
                <p className="text-rose-500 text-xs mt-1">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('tuition.bulk.amount')} *
              </label>
              <input
                type="number"
                min={0}
                {...register('amount', { required: t('tuition.bulk.amountRequired'), min: 1 })}
                placeholder="1,500,000"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {errors.amount && (
                <p className="text-rose-500 text-xs mt-1">{errors.amount.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('tuition.bulk.discount')}
              </label>
              <input
                type="number"
                min={0}
                {...register('discount')}
                placeholder="0"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {t('tuition.bulk.notes')}
            </label>
            <input
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

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              {t('tuition.bulk.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? t('tuition.bulk.submitting') : t('tuition.bulk.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkGenerateModal;
