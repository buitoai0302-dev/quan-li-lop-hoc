import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingDown,
  Search,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/common/UI';
import { useTuitions, useDeleteTuition } from '../hooks/useTuition';
import type { Tuition } from '../api/tuition.api';
import BulkGenerateModal from './BulkGenerateModal';
import PaymentModal from './PaymentModal';
import TuitionReceiptModal from './TuitionReceiptModal';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';
import ConfirmModal from '@/components/common/ConfirmModal';
import { handleApiError } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';
import { TUITION_STATUS } from '@/utils/constants';

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  unpaid: {
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: Clock,
  },
  partial: {
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: AlertCircle,
  },
  paid: {
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  overdue: {
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon: TrendingDown,
  },
  waived: {
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: CheckCircle2,
  },
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleExportSelected = () => {
    import('@/utils/export').then(({ exportToExcel }) => {
      const selected = filtered.filter((t) => selectedIds.includes(t.id));
      const columns = [
        { header: t('tuition.student'), accessor: 'student_name' as const },
        {
          header: t('tuition.classPeriod'),
          accessor: (r: Tuition) => `${r.class_name || ''} ${r.billing_period || ''}`,
        },
        { header: t('tuition.amount'), accessor: 'amount_due' as const },
        { header: t('tuition.paid'), accessor: 'amount_paid' as const },
        {
          header: t('tuition.dueDate'),
          accessor: (r: Tuition) => new Date(r.due_date).toLocaleDateString('vi-VN'),
        },
        {
          header: t('tuition.status'),
          accessor: (r: Tuition) => t(`tuition.statusLabels.${r.status}`),
        },
      ];
      exportToExcel(
        selected,
        columns,
        `${t('tuition.title', 'Học phí')}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}`
      );
    });
  };

  const handleExportPDFSelected = () => {
    import('@/utils/export').then(async ({ exportToPDF }) => {
      const selected = filtered.filter((t) => selectedIds.includes(t.id));
      const columns = [
        { header: t('tuition.student'), accessor: 'student_name' as const },
        {
          header: t('tuition.classPeriod'),
          accessor: (r: Tuition) => `${r.class_name || ''} ${r.billing_period || ''}`,
        },
        { header: t('tuition.amount'), accessor: 'amount_due' as const },
        { header: t('tuition.paid'), accessor: 'amount_paid' as const },
        {
          header: t('tuition.dueDate'),
          accessor: (r: Tuition) => new Date(r.due_date).toLocaleDateString('vi-VN'),
        },
        {
          header: t('tuition.status'),
          accessor: (r: Tuition) => t(`tuition.statusLabels.${r.status}`),
        },
      ];
      const dateLabel = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
      await exportToPDF(
        selected,
        columns,
        `${t('tuition.title', 'Học phí')}_${dateLabel}`,
        `${t('tuition.title', 'Học phí')} - ${dateLabel}`
      );
    });
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={DollarSign}
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowBulkGenerate(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider"
          >
            <CreditCard size={14} className="shrink-0" />
            {t('tuition.bulkGenerate')}
          </Button>
        }
      />

      <div className="flex-1 overflow-auto custom-scrollbar p-1 sm:p-2">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <SummaryCard
            label={t('tuition.totalDue')}
            value={formatCurrency(summary?.total_amount_due || 0)}
            color="blue"
            icon={DollarSign}
          />
          <SummaryCard
            label={t('tuition.totalPaid')}
            value={formatCurrency(summary?.total_paid || 0)}
            color="emerald"
            icon={CheckCircle2}
          />
          <SummaryCard
            label={t('tuition.totalOutstanding')}
            value={formatCurrency(summary?.total_outstanding || 0)}
            color="rose"
            icon={AlertCircle}
          />
          <SummaryCard
            label={t('tuition.totalReceipts')}
            value={String(summary?.total_count || 0)}
            color="slate"
            icon={Receipt}
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-row items-center gap-2 sm:gap-3 mb-4">
          <div className="flex-1 relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder={t('tuition.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="flex-none w-[110px] sm:w-auto text-xs sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t('tuition.allStatus')}</option>
            {Object.keys(STATUS_CONFIG).map((key) => (
              <option key={key} value={key}>
                {t(`tuition.statusLabels.${key}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 sm:min-w-[700px] min-w-full">
              <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-4 py-3 border-b border-gray-100 dark:border-slate-700 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  {[
                    t('tuition.student'),
                    t('tuition.classPeriod'),
                    t('tuition.amount'),
                    t('tuition.paid'),
                    t('tuition.dueDate'),
                    t('tuition.status'),
                    t('tuition.actions'),
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 sm:px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 ${[1, 3, 4].includes(i) ? 'hidden sm:table-cell' : ''}`}
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
                      {t('tuition.emptyState')}
                    </td>
                  </tr>
                )}
                {filtered.map((tuition) => {
                  const statusCfg = STATUS_CONFIG[tuition.status] || STATUS_CONFIG.unpaid;
                  const StatusIcon = statusCfg.icon;
                  const isOverdue =
                    new Date(tuition.due_date) < new Date() &&
                    tuition.status !== TUITION_STATUS.PAID;
                  return (
                    <tr
                      key={tuition.id}
                      className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group ${selectedIds.includes(tuition.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                    >
                      <td className="px-3 sm:px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedIds.includes(tuition.id)}
                          onChange={() => handleToggleSelect(tuition.id)}
                        />
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">
                          {tuition.student_name}
                        </div>
                        {tuition.parent_phone && (
                          <div className="text-[10px] text-gray-400">{tuition.parent_phone}</div>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {tuition.class_name || '—'}
                        </div>
                        {tuition.billing_period && (
                          <div className="text-[10px] text-gray-400">{tuition.billing_period}</div>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-sm text-gray-900 dark:text-white">
                          {formatCurrency(tuition.amount_due)}
                        </div>
                        {tuition.discount > 0 && (
                          <div className="text-[10px] text-emerald-500">
                            -{formatCurrency(tuition.discount)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                        <div className="font-semibold text-sm text-emerald-600">
                          {formatCurrency(tuition.amount_paid)}
                        </div>
                        {tuition.amount_due > tuition.amount_paid && (
                          <div className="text-[10px] text-rose-500">
                            {t('tuition.remaining')}:{' '}
                            {formatCurrency(
                              Number(tuition.amount_due) - Number(tuition.amount_paid)
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                        <span
                          className={`text-sm font-medium ${isOverdue && tuition.status !== TUITION_STATUS.PAID ? 'text-rose-500 font-bold' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          {new Date(tuition.due_date).toLocaleDateString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${StatusIcon ? statusCfg.color : 'bg-gray-100 text-gray-700'}`}
                        >
                          {StatusIcon && <StatusIcon size={12} strokeWidth={3} />}
                          {t(`tuition.statusLabels.${tuition.status}`)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {tuition.status !== TUITION_STATUS.PAID &&
                            tuition.status !== TUITION_STATUS.WAIVED && (
                              <button
                                onClick={() => {
                                  setSelectedTuition(tuition);
                                  setShowPaymentModal(true);
                                }}
                                className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5"
                              >
                                <DollarSign size={14} />
                                <span className="hidden sm:inline">
                                  {t('tuition.collectMoney')}
                                </span>
                              </button>
                            )}
                          <button
                            onClick={() => {
                              setSelectedTuition(tuition);
                              setShowReceiptModal(true);
                            }}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5"
                          >
                            <Receipt size={14} />
                            <span className="hidden sm:inline">{t('tuition.viewReceipt')}</span>
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

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-slate-900 dark:bg-slate-800 text-white px-4 sm:px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4">
            <span className="font-bold text-sm">Đã chọn {selectedIds.length}</span>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex gap-2">
              <button
                onClick={handleExportSelected}
                className="px-3 sm:px-4 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center gap-2"
              >
                <Receipt size={16} />
                <span className="hidden sm:inline">Xuất Excel</span>
                <span className="sm:hidden">Excel</span>
              </button>
              <button
                onClick={handleExportPDFSelected}
                className="px-3 sm:px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center gap-2"
              >
                <Receipt size={16} />
                <span className="hidden sm:inline">Xuất PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
        title={t('tuition.deleteTitle')}
        message={t('tuition.deleteConfirm')}
        type="danger"
        isLoading={isDeleting}
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
      className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col gap-1 sm:gap-2`}
    >
      <div
        className={`flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${iconColorMap[color]}`}
      >
        <Icon size={12} className="sm:w-[14px] sm:h-[14px]" />{' '}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-sm sm:text-lg font-black text-gray-900 dark:text-white truncate">
        {value}
      </div>
    </div>
  );
};

export default TuitionPage;
