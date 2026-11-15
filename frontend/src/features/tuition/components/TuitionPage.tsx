import PageError from '@/components/common/PageError';
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
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/common/UI';
import { useTuitions, useDeleteTuition } from '../hooks/useTuition';
import type { Tuition } from '../api/tuition.api';
import BulkGenerateModal from './BulkGenerateModal';
import PaymentModal from './PaymentModal';
import TuitionReceiptModal from './TuitionReceiptModal';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';
import RowActions from '@/components/common/RowActions';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmModal from '@/components/common/ConfirmModal';
import { handleApiError } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';
import { TUITION_STATUS, USER_ROLES } from '@/utils/constants';
import { formatCurrency, formatDate } from '@/utils/formatters';

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

const TuitionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canDelete = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;
  const getTuitionActions = (tuition: Tuition) => {
    const canCollect =
      tuition.status !== TUITION_STATUS.PAID && tuition.status !== TUITION_STATUS.WAIVED;
    return [
      ...(canCollect
        ? [
            {
              label: t('tuition.collectMoney'),
              icon: <DollarSign size={16} />,
              mobilePrimary: true,
              onClick: () => {
                setSelectedTuition(tuition);
                setShowPaymentModal(true);
              },
            },
          ]
        : []),
      {
        label: t('tuition.viewReceipt'),
        icon: <Receipt size={16} />,
        mobilePrimary: !canCollect,
        onClick: () => {
          setSelectedTuition(tuition);
          setShowReceiptModal(true);
        },
      },
      ...(canDelete
        ? [
            {
              label: t('common.delete'),
              icon: <Trash2 size={16} />,
              tone: 'danger' as const,
              onClick: () => setDeleteId(tuition.id),
            },
          ]
        : []),
    ];
  };

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkGenerate, setShowBulkGenerate] = useState(false);
  const [selectedTuition, setSelectedTuition] = useState<Tuition | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const pageQuery = useTuitions(filters);
  const { data, isLoading } = pageQuery;
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
          accessor: (r: Tuition) => formatDate(r.due_date, i18n.language),
        },
        {
          header: t('tuition.status'),
          accessor: (r: Tuition) => t(`tuition.statusLabels.${r.status}`),
        },
      ];
      exportToExcel(
        selected,
        columns,
        `${t('tuition.title', 'Học phí')}_${formatDate(new Date(), i18n.language).replace(/\//g, '-')}`
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
          accessor: (r: Tuition) => formatDate(r.due_date, i18n.language),
        },
        {
          header: t('tuition.status'),
          accessor: (r: Tuition) => t(`tuition.statusLabels.${r.status}`),
        },
      ];
      const dateLabel = formatDate(new Date(), i18n.language).replace(/\//g, '-');
      await exportToPDF(
        selected,
        columns,
        `${t('tuition.title', 'Học phí')}_${dateLabel}`,
        `${t('tuition.title', 'Học phí')} - ${dateLabel}`
      );
    });
  };

  if (isLoading) return <PageLoading />;

  const failedQueries = [pageQuery].filter((query) => query.isError && query.data === undefined);
  if (failedQueries.length > 0)
    return (
      <PageError
        retrying={failedQueries.some((query) => query.isFetching)}
        onRetry={() => Promise.all(failedQueries.map((query) => query.refetch()))}
      />
    );

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
      >
        <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
          <div className="flex-1 relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              aria-label={t('tuition.searchPlaceholder')}
              placeholder={t('tuition.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-11 w-full pl-8 pr-3 py-1.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            aria-label={t('common.status')}
            value={filters.status || ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="min-h-11 flex-none w-[110px] sm:w-[130px] text-base sm:text-sm text-gray-900 dark:text-white bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t('tuition.allStatus')}</option>
            {Object.keys(STATUS_CONFIG).map((key) => (
              <option key={key} value={key}>
                {t(`tuition.statusLabels.${key}`)}
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

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

        <div className="grid gap-3 xl:hidden">
          {filtered.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-center text-slate-500 dark:bg-slate-900">
              {t('tuition.emptyState')}
            </p>
          )}
          {filtered.map((tuition) => {
            const statusCfg = STATUS_CONFIG[tuition.status] || STATUS_CONFIG.unpaid;
            return (
              <article
                key={tuition.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-900 dark:text-white">
                      {tuition.student_name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      {tuition.class_name} · {tuition.billing_period}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0"
                    aria-label={t('common.selectItem', { name: tuition.student_name })}
                    checked={selectedIds.includes(tuition.id)}
                    onChange={() => handleToggleSelect(tuition.id)}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(tuition.amount_due)}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusCfg.color}`}>
                    {t(`tuition.statusLabels.${tuition.status}`)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                  {t('tuition.paid')}: {formatCurrency(tuition.amount_paid)} ·{' '}
                  {t('tuition.dueDate')}: {formatDate(tuition.due_date, i18n.language)}
                </p>
                <div className="flex justify-end border-t border-slate-100 pt-2 dark:border-slate-700">
                  <RowActions actions={getTuitionActions(tuition)} />
                </div>
              </article>
            );
          })}
        </div>
        {/* Table */}
        <div className="hidden xl:block bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="management-table w-full table-fixed border-separate border-spacing-0">
              <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-4 py-3 border-b border-gray-100 dark:border-slate-700 w-12">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      aria-label={t('common.selectAll')}
                      checked={
                        filtered.length > 0 &&
                        filtered.every((item) => selectedIds.includes(item.id))
                      }
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
                      className={`px-3 sm:px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 ${['', 'w-[18%]', 'w-32', 'w-36', 'w-28', 'w-28', 'w-32'][i]}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
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
                          aria-label={t('common.selectItem', { name: tuition.student_name })}
                          checked={selectedIds.includes(tuition.id)}
                          onChange={() => handleToggleSelect(tuition.id)}
                        />
                      </td>
                      <td className="px-3 py-3 break-words">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">
                          {tuition.student_name}
                        </div>
                        {tuition.parent_phone && (
                          <div className="text-xs text-slate-600 dark:text-slate-300">
                            {tuition.parent_phone}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 break-words hidden sm:table-cell">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {tuition.class_name || '—'}
                        </div>
                        {tuition.billing_period && (
                          <div className="text-xs text-slate-600 dark:text-slate-300">
                            {tuition.billing_period}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 break-words">
                        <div className="font-bold text-sm tabular-nums text-gray-900 dark:text-white">
                          {formatCurrency(tuition.amount_due)}
                        </div>
                        {tuition.discount > 0 && (
                          <div className="text-[10px] text-emerald-500">
                            -{formatCurrency(tuition.discount)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 break-words hidden sm:table-cell">
                        <div className="font-semibold text-sm tabular-nums text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(tuition.amount_paid)}
                        </div>
                        {tuition.amount_due > tuition.amount_paid && (
                          <div className="text-xs text-rose-700 dark:text-rose-300">
                            {t('tuition.remaining')}:{' '}
                            {formatCurrency(
                              Number(tuition.amount_due) - Number(tuition.amount_paid)
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 break-words hidden sm:table-cell">
                        <span
                          className={`text-sm font-medium ${isOverdue && tuition.status !== TUITION_STATUS.PAID ? 'text-rose-500 font-bold' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          {formatDate(tuition.due_date, i18n.language)}
                        </span>
                      </td>
                      <td className="px-3 py-3 break-words">
                        <span
                          className={`inline-flex max-w-full items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${StatusIcon ? statusCfg.color : 'bg-gray-100 text-gray-700'}`}
                        >
                          {StatusIcon && <StatusIcon size={12} strokeWidth={3} />}
                          {t(`tuition.statusLabels.${tuition.status}`)}
                        </span>
                      </td>
                      <td className="px-3 py-3 break-words">
                        <RowActions actions={getTuitionActions(tuition)} />
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
            <span className="font-bold text-sm">
              {t('common.selectedCount', { count: selectedIds.length })}
            </span>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex gap-2">
              <button
                onClick={handleExportSelected}
                className="px-3 sm:px-4 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center gap-2"
              >
                <Receipt size={16} />
                <span className="hidden sm:inline">{t('export.excel')}</span>
                <span className="sm:hidden">Excel</span>
              </button>
              <button
                onClick={handleExportPDFSelected}
                className="px-3 sm:px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center gap-2"
              >
                <Receipt size={16} />
                <span className="hidden sm:inline">{t('export.pdf')}</span>
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
