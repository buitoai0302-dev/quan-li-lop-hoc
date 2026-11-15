import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Receipt } from 'lucide-react';
import { Modal, Button } from '@/components/common/UI';
import PageError from '@/components/common/PageError';
import Pagination from '@/components/common/Pagination';
import ConfirmModal from '@/components/common/ConfirmModal';
import ActionHint from '@/components/common/ActionHint';
import {
  isPageNumber,
  isPageSize,
  useWorkflowScope,
  useWorkflowScroll,
  useWorkflowState,
} from '@/hooks/useWorkflowState';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { TUITION_STATUS } from '@/utils/constants';
import { tuitionApi } from '@/features/tuition/api/tuition.api';
import PaymentModal from '@/features/tuition/components/PaymentModal';
import TuitionReceiptModal from '@/features/tuition/components/TuitionReceiptModal';
import {
  studentProfileApi,
  PROFILE_TABS,
  isProfileTab,
  type ProfileTab,
} from '../api/student-profile.api';

interface Props {
  studentId: string;
  initialTab?: ProfileTab;
  tuitionId?: string;
  onClose: () => void;
}
export default function StudentProfile({ studentId, initialTab, tuitionId, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const scope = useWorkflowScope();
  const navigate = useNavigate();
  const tabId = useId();
  const [isOpen, setIsOpen] = useState(true);
  const [tab, setTab] = useWorkflowState<ProfileTab>(
    `profile:${studentId}`,
    'tab',
    initialTab || 'classes',
    isProfileTab,
    false,
    initialTab
  );
  const [page, setPage] = useWorkflowState(`profile:${studentId}:${tab}`, 'page', 1, isPageNumber);
  const [limit, setLimit] = useWorkflowState(
    `profile:${studentId}:${tab}`,
    'limit',
    20,
    (value): value is number => isPageSize(value) && value <= 50
  );
  const [tuitionFilterId, setTuitionFilterId] = useState(tuitionId);
  const [action, setAction] = useState<{
    kind: 'confirm' | 'payment' | 'receipt';
    id: string;
  } | null>(null);
  const profile = useQuery({
    queryKey: ['student-profile', scope, studentId],
    queryFn: ({ signal }) => studentProfileApi.get(studentId, signal),
  });
  const history = useQuery({
    queryKey: ['student-profile', scope, studentId, tab, page, limit],
    queryFn: ({ signal }) =>
      studentProfileApi.history(
        studentId,
        tab as Exclude<ProfileTab, 'tuition'>,
        limit,
        (page - 1) * limit,
        signal
      ),
    enabled: tab !== 'tuition' && !!profile.data,
  });
  const tuitions = useQuery({
    queryKey: ['tuitions', scope, 'profile', studentId, page, limit, tuitionFilterId],
    queryFn: ({ signal }) =>
      tuitionApi.list(
        {
          student_id: studentId,
          limit: String(limit),
          offset: String((page - 1) * limit),
          ...(tuitionFilterId ? { tuition_id: tuitionFilterId } : {}),
        },
        signal
      ),
    enabled: tab === 'tuition' && !!profile.data,
  });
  const selected = useQuery({
    queryKey: ['tuitions', scope, 'profile-action', studentId, action?.id],
    queryFn: ({ signal }) =>
      tuitionApi.list({ student_id: studentId, tuition_id: action!.id, limit: '1' }, signal),
    enabled: !!action,
    staleTime: 0,
  });
  const selectedTuition = selected.data?.data[0];
  const activeQuery = tab === 'tuition' ? tuitions : history;
  const total =
    tab === 'tuition' ? Number(tuitions.data?.summary.total_count || 0) : history.data?.total || 0;
  const showChild = !!selectedTuition && (action?.kind === 'payment' || action?.kind === 'receipt');
  const scrollRef = useWorkflowScroll(
    `profile:${studentId}:${tab}:${page}`,
    activeQuery.isSuccess && isOpen && !showChild
  );
  useEffect(() => {
    if (activeQuery.isSuccess)
      setPage((current) => Math.min(current, Math.max(1, Math.ceil(total / limit))));
  }, [activeQuery.isSuccess, total, limit, setPage]);
  return (
    <>
      <Modal
        closeLabel={t('common.close')}
        isOpen={isOpen && !showChild}
        onClose={() => setIsOpen(false)}
        onAfterClose={() => {
          if (!isOpen) onClose();
        }}
        placement="right"
        width="clamp(480px, 56vw, 820px)"
        title={t('workflow.profile.title')}
        bodyClassName="flex min-h-0 flex-col overflow-hidden"
        footer={
          <Pagination
            pageSizeOptions={[5, 10, 20, 50]}
            currentPage={page}
            totalItems={total}
            itemsPerPage={limit}
            onPageChange={setPage}
            onItemsPerPageChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
          />
        }
      >
        {profile.isError ? (
          <PageError onRetry={() => profile.refetch()} retrying={profile.isFetching} />
        ) : profile.isPending ? (
          <p role="status">{t('common.loading')}</p>
        ) : (
          <>
            <div className="shrink-0 pb-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                {profile.data.full_name}
              </h3>
              <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-400">
                {profile.data.email}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {[profile.data.branch_name, profile.data.phone].filter(Boolean).join(' · ')}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    {t('workflow.profile.paid')}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(profile.data.paid_vnd)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    {t('workflow.profile.outstanding')}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                    {formatCurrency(profile.data.outstanding_vnd)}
                  </dd>
                </div>
              </dl>
            </div>
            <div
              role="tablist"
              aria-label={t('workflow.profile.title')}
              className="grid shrink-0 grid-cols-4 border-b border-slate-200 dark:border-slate-700"
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const current = PROFILE_TABS.indexOf(tab);
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? PROFILE_TABS.length - 1
                      : (current + (event.key === 'ArrowRight' ? 1 : -1) + PROFILE_TABS.length) %
                        PROFILE_TABS.length;
                setTab(PROFILE_TABS[next]);
                document.getElementById(`${tabId}-${PROFILE_TABS[next]}`)?.focus();
              }}
            >
              {PROFILE_TABS.map((value) => (
                <button
                  key={value}
                  id={`${tabId}-${value}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  aria-controls={`${tabId}-content`}
                  tabIndex={tab === value ? 0 : -1}
                  onClick={() => setTab(value)}
                  className={`min-h-11 px-1 text-xs sm:text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary ${tab === value ? 'border-b-2 border-primary text-primary dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  {t(`workflow.profile.${value}`)}
                </button>
              ))}
            </div>
            <div
              ref={scrollRef}
              id={`${tabId}-content`}
              role="tabpanel"
              aria-labelledby={`${tabId}-${tab}`}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 custom-scrollbar"
            >
              {tab === 'tuition' && tuitionFilterId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTuitionFilterId(undefined);
                    setPage(1);
                  }}
                >
                  {t('workflow.profile.allTuition')}
                </Button>
              )}
              {action && !selectedTuition && (
                <div className="mb-3 text-sm" role="status">
                  {selected.isError || selected.isSuccess ? (
                    <>
                      <p>{t('workflow.profile.unavailable')}</p>
                      <Button variant="ghost" onClick={() => setAction(null)}>
                        {t('workflow.profile.back')}
                      </Button>
                    </>
                  ) : (
                    t('common.loading')
                  )}
                </div>
              )}
              {activeQuery.isError ? (
                <PageError
                  onRetry={() => activeQuery.refetch()}
                  retrying={activeQuery.isFetching}
                />
              ) : activeQuery.isPending ? (
                <p role="status">{t('common.loading')}</p>
              ) : !total ? (
                <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
                  {t('workflow.profile.empty')}
                </p>
              ) : tab === 'tuition' ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tuitions.data?.data.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {item.class_name || t('workflow.profile.tuition')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.billing_period} · {formatDate(item.due_date, i18n.language)}
                        </p>
                        <p className="mt-1 text-sm tabular-nums text-slate-700 dark:text-slate-200">
                          {formatCurrency(
                            Math.max(0, Number(item.amount_due) - Number(item.amount_paid))
                          )}{' '}
                          <span className="text-xs">
                            {t(`tuition.statusLabels.${item.status}`)}
                          </span>
                        </p>
                      </div>
                      {item.status !== TUITION_STATUS.WAIVED &&
                        Number(item.amount_due) > Number(item.amount_paid) && (
                          <ActionHint label={t('workflow.profile.collect')} showTouchLabel={false}>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => setAction({ kind: 'confirm', id: item.id })}
                            >
                              <CreditCard size={18} />
                            </Button>
                          </ActionHint>
                        )}
                      <ActionHint label={t('workflow.profile.receipt')} showTouchLabel={false}>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setAction({ kind: 'receipt', id: item.id })}
                        >
                          <Receipt size={18} />
                        </Button>
                      </ActionHint>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.data?.items.map((item) => (
                    <li key={item.id} className="py-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {item.title || t('workflow.profile.tuition')}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(item.date, i18n.language)}
                        {item.start_time
                          ? ` · ${item.start_time.slice(0, 5)}–${item.end_time?.slice(0, 5)}`
                          : ''}
                      </p>
                      {tab === 'classes' && (
                        <>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {item.teacher_name}
                          </p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() =>
                              navigate(`/schedule?${new URLSearchParams({ classId: item.id })}`)
                            }
                          >
                            {t('workflow.profile.viewSchedule')}
                          </Button>
                        </>
                      )}
                      {tab === 'attendance' && (
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                          {t(`attendance.${item.status}`)}
                        </p>
                      )}
                      {tab === 'payments' && (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(item.amount_vnd || '0')}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAction({ kind: 'receipt', id: item.tuition_id! })}
                          >
                            {t('workflow.profile.receipt')}
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </Modal>
      {action?.kind === 'confirm' && selectedTuition && (
        <ConfirmModal
          isOpen
          onClose={() => setAction((current) => (current?.kind === 'confirm' ? null : current))}
          onConfirm={() => setAction({ kind: 'payment', id: selectedTuition.id })}
          type="primary"
          title={t('workflow.profile.collect')}
          message={t('workflow.profile.confirmPayment', {
            name: selectedTuition.student_name,
            amount: formatCurrency(
              Number(selectedTuition.amount_due) - Number(selectedTuition.amount_paid)
            ),
          })}
        />
      )}
      {action?.kind === 'payment' && selectedTuition && (
        <PaymentModal
          tuition={selectedTuition}
          onClose={() => setAction(null)}
          backLabel={t('workflow.profile.back')}
        />
      )}
      {action?.kind === 'receipt' && selectedTuition && (
        <TuitionReceiptModal
          tuition={selectedTuition}
          onClose={() => setAction(null)}
          backLabel={t('workflow.profile.back')}
        />
      )}
    </>
  );
}
