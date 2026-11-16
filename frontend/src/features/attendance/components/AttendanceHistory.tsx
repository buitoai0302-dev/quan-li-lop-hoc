import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '@/components/common/UI';
import PageLoading from '@/components/common/PageLoading';
import PageError from '@/components/common/PageError';
import { useWorkflowScope } from '@/hooks/useWorkflowState';
import { getAttendanceHistory } from '../api/attendance.api';

export default function AttendanceHistory({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const scope = useWorkflowScope();
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ['attendance-history', scope, sessionId, offset],
    queryFn: ({ signal }) => getAttendanceHistory(sessionId, offset, signal),
  });
  return (
    <Modal
      isOpen
      placement="right"
      width="min(38rem, 100vw)"
      title={t('attendance.history')}
      onClose={onClose}
    >
      {query.isPending ? (
        <PageLoading />
      ) : query.isError ? (
        <PageError onRetry={() => query.refetch()} />
      ) : (
        <div className="space-y-3">
          {!query.data.items.length && <p>{t('common.noData')}</p>}
          {query.data.items.map((item) => (
            <article
              key={item.id}
              className="space-y-1 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
            >
              <strong>{item.full_name}</strong>
              <p>
                {t(`attendance.${item.before_status || 'none'}`)} →{' '}
                {t(`attendance.${item.after_status}`)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.actor_name} · {new Date(item.created_at).toLocaleString(i18n.language)}
              </p>
              {item.reason && <p className="break-words">{item.reason}</p>}
              {item.confirmed_addition && <p>{t('attendance.confirmedAddition')}</p>}
            </article>
          ))}
          <div className="flex justify-between gap-2">
            <Button
              disabled={!offset}
              onClick={() => setOffset((value) => Math.max(0, value - 50))}
            >
              {t('common.previous')}
            </Button>
            <Button disabled={!query.data.hasMore} onClick={() => setOffset((value) => value + 50)}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
