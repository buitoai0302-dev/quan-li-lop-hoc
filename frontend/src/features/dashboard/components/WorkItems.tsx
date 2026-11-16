import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardCheck, RefreshCw } from 'lucide-react';
import { Modal, Button } from '@/components/common/UI';
import Pagination from '@/components/common/Pagination';
import PageError from '@/components/common/PageError';
import { useWorkflowScope } from '@/hooks/useWorkflowState';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getWorkItems, type WorkItem, type WorkItemType } from '../api/work-items.api';

function ItemList({ type, items, date }: { type: WorkItemType; items: WorkItem[]; date: string }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const open = (item: WorkItem) => {
    if (type === 'attendance')
      navigate(
        `/attendance?${new URLSearchParams({ date: item.date || date, sessionId: item.id })}`
      );
    else if (type === 'tuition')
      navigate(
        `/students?${new URLSearchParams({ studentId: item.student_id!, tab: 'tuition', tuitionId: item.id })}`
      );
    else if (item.missing_teacher)
      navigate(`/classes?${new URLSearchParams({ classId: item.id })}`);
    else navigate(`/schedule?${new URLSearchParams({ classId: item.id, date })}`);
  };
  if (!items.length)
    return (
      <p className="py-5 text-sm text-slate-500 dark:text-slate-400">
        {t('workflow.workItems.empty')}
      </p>
    );
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => open(item)}
            className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary dark:hover:bg-slate-800"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                {item.title}
              </span>
              <span className="block text-xs text-slate-600 dark:text-slate-400">
                {type === 'attendance'
                  ? `${item.start_time?.slice(0, 5)}–${item.end_time?.slice(0, 5)}`
                  : type === 'tuition'
                    ? `${formatDate(item.date || '', i18n.language)} · ${formatCurrency(item.outstanding_vnd || '0')}`
                    : t(
                        `workflow.workItems.${item.missing_teacher && item.missing_sessions ? 'missingBoth' : item.missing_teacher ? 'missingTeacher' : 'missingSessions'}`
                      )}
              </span>
            </span>
            <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-slate-400" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function WorkItemsPanel({ group, onClose }: { group: WorkItemType; onClose: () => void }) {
  const { t } = useTranslation();
  const scope = useWorkflowScope();
  const [isOpen, setIsOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const query = useQuery({
    queryKey: ['work-items', scope, group, page, limit],
    queryFn: ({ signal }) => getWorkItems({ group, limit, offset: (page - 1) * limit }, signal),
  });
  const data = query.data?.groups[0];
  useEffect(() => {
    if (data) setPage((current) => Math.min(current, Math.max(1, Math.ceil(data.total / limit))));
  }, [data, limit]);
  return (
    <Modal
      closeLabel={t('common.close')}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onAfterClose={onClose}
      placement="right"
      width="clamp(420px, 42vw, 640px)"
      title={t(`workflow.workItems.${group}`)}
      footer={
        data ? (
          <Pagination
            pageSizeOptions={[5, 10, 20, 50]}
            currentPage={page}
            totalItems={data.total}
            itemsPerPage={limit}
            onPageChange={setPage}
            onItemsPerPageChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
          />
        ) : undefined
      }
    >
      {query.isError ? (
        <PageError onRetry={() => query.refetch()} retrying={query.isFetching} />
      ) : query.isPending ? (
        <p role="status">{t('common.loading')}</p>
      ) : (
        <ItemList type={group} items={data?.items || []} date={query.data.businessDate} />
      )}
    </Modal>
  );
}

export default function WorkItems() {
  const { t, i18n } = useTranslation();
  const scope = useWorkflowScope();
  const [group, setGroup] = useState<WorkItemType | null>(null);
  const query = useQuery({
    queryKey: ['work-items', scope, 'preview'],
    queryFn: ({ signal }) => getWorkItems({}, signal),
    enabled: !!scope,
    staleTime: 30000,
  });
  return (
    <section
      aria-label={t('workflow.workItems.title')}
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
          <ClipboardCheck size={18} className="text-primary" />
          {t('workflow.workItems.title')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('workflow.refresh')}
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw size={16} />
        </Button>
      </div>
      {query.data && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {formatDate(query.data.businessDate, i18n.language)}
        </p>
      )}
      {query.isError ? (
        <PageError onRetry={() => query.refetch()} retrying={query.isFetching} />
      ) : query.isPending ? (
        <p role="status" className="py-4 text-sm">
          {t('common.loading')}
        </p>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {query.data.groups.map((item) => (
            <div
              key={item.type}
              className="min-w-0 border-t border-slate-100 pt-3 dark:border-slate-800"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t(`workflow.workItems.${item.type}`)}
                </h3>
                <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {item.total}
                </span>
              </div>
              <ItemList type={item.type} items={item.items} date={query.data.businessDate} />
              {item.total > item.items.length && (
                <Button size="sm" variant="ghost" onClick={() => setGroup(item.type)}>
                  {t('workflow.viewAll', { count: item.total })}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {group && <WorkItemsPanel key={group} group={group} onClose={() => setGroup(null)} />}
    </section>
  );
}
