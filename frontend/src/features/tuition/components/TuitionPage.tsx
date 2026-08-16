import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingDown,
  Plus,
  Zap,
  Download,
  Search,
  Filter,
  ChevronDown,
  Receipt,
} from 'lucide-react';
import { useTuitions, useDeleteTuition } from '../hooks/useTuition';
import { useClasses } from '@/features/classes/hooks/useClasses';
import { Tuition } from '../api/tuition.api';
import BulkGenerateModal from './BulkGenerateModal';
import PaymentModal from './PaymentModal';
import TuitionReceiptModal from './TuitionReceiptModal';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';
import ConfirmModal from '@/components/common/ConfirmModal';
import toast from 'react-hot-toast';
import { handleApiError } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';

const STATUS_CONFIG = {
  unpaid: {
    label: 'Chưa thu',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: Clock,
  },
  partial: {
    label: 'Còn thiếu',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: AlertCircle,
  },
  paid: {
    label: 'Đã thu đủ',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  overdue: {
    label: 'Quá hạn',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon: TrendingDown,
  },
  waived: {
    label: 'Miễn giảm',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: CheckCircle2,
  },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
  vnpay: 'VNPay',
  stripe: 'Stripe',
  other: 'Khác',
};

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));

const TuitionPage: React.FC = () => {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkGenerate, setShowBulkGenerate] = useState(false);
  const [selectedTuition, setSelectedTuition] = useState<Tuition | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useTuitions(filters);
  const { mutate: deleteTuition, isPending: isDeleting } = useDeleteTuition();

  const tuitions = data?.data || [];
  const summary = data?.summary;

  const filtered = tuitions.filter(
    (t) =>
      !searchQuery ||
      t.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.class_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = () => {
    if (!deleteId) return;
    deleteTuition(deleteId, {
      onSuccess: () => setDeleteId(null),
      onError: (err) => handleApiError(err as AxiosError<ApiErrorData>, t),
    });
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader icon={DollarSign} />

      <div className="flex-1 overflow-auto custom-scrollbar p-1">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            label="Tổng phải thu"
            value={formatCurrency(summary?.total_amount_due || 0)}
            color="blue"
            icon={DollarSign}
          />
          <SummaryCard
            label="Đã thu"
            value={formatCurrency(summary?.total_paid || 0)}
            color="emerald"
            icon={CheckCircle2}
          />
          <SummaryCard
            label="Còn nợ"
            value={formatCurrency(summary?.total_outstanding || 0)}
            color="rose"
            icon={AlertCircle}
          />
          <SummaryCard
            label="Số phiếu"
            value={String(summary?.total_count || 0)}
            color="slate"
            icon={Receipt}
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="flex-1 relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh hoặc lớp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowBulkGenerate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all active:scale-95 shadow-sm shadow-primary/20"
          >
            <Zap size={16} />
            Tạo hàng loạt
          </button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 min-w-[700px]">
              <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-10">
                <tr>
                  {[
                    'Học sinh',
                    'Lớp / Kỳ',
                    'Số tiền',
                    'Đã thu',
                    'Hạn thu',
                    'Trạng thái',
                    'Thao tác',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                      <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
                      Chưa có khoản học phí nào
                    </td>
                  </tr>
                )}
                {filtered.map((tuition) => {
                  const statusCfg = STATUS_CONFIG[tuition.status] || STATUS_CONFIG.unpaid;
                  const StatusIcon = statusCfg.icon;
                  const isOverdue =
                    new Date(tuition.due_date) < new Date() && tuition.status !== 'paid';
                  return (
                    <tr
                      key={tuition.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">
                          {tuition.student_name}
                        </div>
                        {tuition.parent_phone && (
                          <div className="text-[10px] text-gray-400">{tuition.parent_phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {tuition.class_name || '—'}
                        </div>
                        {tuition.billing_period && (
                          <div className="text-[10px] text-gray-400">{tuition.billing_period}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-sm text-gray-900 dark:text-white">
                          {formatCurrency(tuition.amount_due)}
                        </div>
                        {tuition.discount > 0 && (
                          <div className="text-[10px] text-emerald-500">
                            -{formatCurrency(tuition.discount)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-sm text-emerald-600">
                          {formatCurrency(tuition.amount_paid)}
                        </div>
                        {tuition.amount_due > tuition.amount_paid && (
                          <div className="text-[10px] text-rose-500">
                            Còn:{' '}
                            {formatCurrency(
                              Number(tuition.amount_due) - Number(tuition.amount_paid)
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${isOverdue && tuition.status !== 'paid' ? 'text-rose-500 font-bold' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          {new Date(tuition.due_date).toLocaleDateString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusCfg.color}`}
                        >
                          <StatusIcon size={10} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {tuition.status !== 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedTuition(tuition);
                                setShowPaymentModal(true);
                              }}
                              className="p-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                              title="Thu tiền"
                            >
                              <DollarSign size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedTuition(tuition);
                              setShowReceiptModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Xem biên lai"
                          >
                            <Receipt size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteId(tuition.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showBulkGenerate && <BulkGenerateModal onClose={() => setShowBulkGenerate(false)} />}
      {selectedTuition && showPaymentModal && (
        <PaymentModal
          tuition={selectedTuition}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedTuition(null);
          }}
        />
      )}
      {selectedTuition && showReceiptModal && (
        <TuitionReceiptModal
          tuition={selectedTuition}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedTuition(null);
          }}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Xóa khoản học phí"
        message="Bạn có chắc chắn muốn xóa khoản học phí này?"
        confirmText="Xóa"
        type="danger"
      />
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: string;
  color: string;
  icon: React.ElementType;
}> = ({ label, value, color, icon: Icon }) => {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/10 to-indigo-500/10 border-blue-100 dark:border-blue-900/30',
    emerald: 'from-emerald-500/10 to-teal-500/10 border-emerald-100 dark:border-emerald-900/30',
    rose: 'from-rose-500/10 to-red-500/10 border-rose-100 dark:border-rose-900/30',
    slate: 'from-slate-500/10 to-gray-500/10 border-slate-100 dark:border-slate-800',
  };
  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    rose: 'text-rose-500',
    slate: 'text-slate-500',
  };
  return (
    <div
      className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-4 flex flex-col gap-2`}
    >
      <div
        className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${iconColorMap[color]}`}
      >
        <Icon size={14} /> {label}
      </div>
      <div className="text-lg font-black text-gray-900 dark:text-white truncate">{value}</div>
    </div>
  );
};

export default TuitionPage;
