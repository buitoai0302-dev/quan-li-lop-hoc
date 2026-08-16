import React from 'react';
import { useForm } from 'react-hook-form';
import { DollarSign, X } from 'lucide-react';
import { useRecordPayment } from '../hooks/useTuition';
import { RecordPaymentDto, Tuition } from '../api/tuition.api';
import { handleApiError } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';
import { useTranslation } from 'react-i18next';

interface Props {
  tuition: Tuition;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 Tiền mặt' },
  { value: 'bank_transfer', label: '🏦 Chuyển khoản ngân hàng' },
  { value: 'momo', label: '📱 Ví MoMo' },
  { value: 'vnpay', label: '💳 VNPay' },
  { value: 'other', label: '🔧 Khác' },
];

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));

const PaymentModal: React.FC<Props> = ({ tuition, onClose }) => {
  const { t } = useTranslation();
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
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = (data: RecordPaymentDto) => {
    mutate(data, {
      onSuccess: onClose,
      onError: (err) => handleApiError(err as AxiosError<ApiErrorData>, t),
    });
  };

  const paymentMethod = watch('payment_method');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <DollarSign size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                Ghi nhận thu tiền
              </h2>
              <p className="text-xs text-gray-500">{tuition.student_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info */}
        <div className="mx-5 mt-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-bold">Phải thu</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">
              {formatCurrency(tuition.amount_due)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-bold">Đã thu</div>
            <div className="text-sm font-black text-emerald-600">
              {formatCurrency(tuition.amount_paid)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-bold">Còn lại</div>
            <div className="text-sm font-black text-rose-500">{formatCurrency(remaining)}</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Số tiền thu (VNĐ) *
            </label>
            <input
              type="number"
              min={1}
              max={remaining}
              {...register('amount_paid', {
                required: 'Nhập số tiền',
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
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Ngày thu
              </label>
              <input
                type="date"
                {...register('payment_date')}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Hình thức
              </label>
              <select
                {...register('payment_method')}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(paymentMethod === 'bank_transfer' ||
            paymentMethod === 'vnpay' ||
            paymentMethod === 'momo') && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Mã giao dịch
              </label>
              <input
                type="text"
                {...register('reference_code')}
                placeholder="TXN1234567890"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Ghi chú
            </label>
            <input
              type="text"
              {...register('notes')}
              placeholder="Nhập ghi chú nếu cần..."
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-60 shadow-sm shadow-emerald-600/20"
            >
              <DollarSign size={16} />
              {isPending ? 'Đang lưu...' : 'Xác nhận thu tiền'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
