import { useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/UI';
import ConfirmModal from '@/components/common/ConfirmModal';
import PageError from '@/components/common/PageError';
import { useWorkflowScope } from '@/hooks/useWorkflowState';
import { handleApiError } from '@/utils/errorHelper';
import {
  GOOGLE_SYNC_STATES,
  getGoogleSyncProgress,
  retryGoogleSyncJob,
} from '../api/google-sync.api';

const GOOGLE_SYNC_POLL_INTERVAL_MS = 10000;

export default function GoogleSyncStatus({ onReconnect }: { onReconnect: () => void }) {
  const { t } = useTranslation();
  const scope = useWorkflowScope();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const query = useQuery({
    queryKey: ['google-sync', scope],
    queryFn: ({ signal }) => getGoogleSyncProgress(undefined, signal),
    refetchInterval: (query) => (query.state.data?.paused ? false : GOOGLE_SYNC_POLL_INTERVAL_MS),
  });
  const retry = async (confirmLegacy = false) => {
    setBusy(true);
    try {
      await retryGoogleSyncJob(undefined, confirmLegacy);
      await client.invalidateQueries({ queryKey: ['google-sync'] });
      setConfirm(false);
    } catch (error) {
      if (isAxiosError(error)) handleApiError(error, t);
      else toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };
  if (query.isError)
    return <PageError onRetry={() => query.refetch()} retrying={query.isFetching} />;
  if (!query.data) return <p role="status">{t('common.loading')}</p>;
  const { counts, paused } = query.data;
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <h4 className="font-semibold text-slate-900 dark:text-white">{t('googleSync.title')}</h4>
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('googleSync.personal')}</p>
      <div
        aria-live="polite"
        className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700 dark:text-slate-200"
      >
        {GOOGLE_SYNC_STATES.filter((state) => counts[state] > 0).map((state) => (
          <span key={state}>
            {t(`googleSync.states.${state}`)}:{' '}
            <strong className="tabular-nums">{counts[state]}</strong>
          </span>
        ))}
        {!query.data.total && <span>{t('googleSync.empty')}</span>}
      </div>
      {paused && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
          {t('googleSync.paused')}
        </p>
      )}
      {!!counts.connection_required && (
        <p className="text-sm text-amber-700 dark:text-amber-300">{t('googleSync.reconnect')}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {!!counts.retry_needed && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void retry()}
          >
            {t('googleSync.retry')}
          </Button>
        )}
        {!!counts.connection_required && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onReconnect}>
            {t('googleSync.reconnectAction')}
          </Button>
        )}
        {!!counts.confirmation_required && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            {t('googleSync.reviewLegacy')}
          </Button>
        )}
      </div>
      <ConfirmModal
        isOpen={confirm}
        isLoading={busy}
        onClose={() => setConfirm(false)}
        onConfirm={() => retry(true)}
        title={t('googleSync.reviewLegacy')}
        message={t('googleSync.confirmLegacy')}
        type="primary"
      />
    </section>
  );
}
