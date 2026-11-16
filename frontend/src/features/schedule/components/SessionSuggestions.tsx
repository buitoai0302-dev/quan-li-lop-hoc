import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/UI';
import { useWorkflowScope } from '@/hooks/useWorkflowState';
import {
  getScheduleSuggestions,
  type ScheduleSuggestion,
  type SuggestionsRequest,
} from '../api/schedule.api';

interface Props {
  request: SuggestionsRequest;
  onSelect: (value: ScheduleSuggestion) => void;
  disabled?: boolean;
}
export default function SessionSuggestions(props: Props) {
  // Remount when the draft changes so a late response can never replace newer edits.
  return <SuggestionList key={JSON.stringify(props.request)} {...props} />;
}
function SuggestionList({ request, onSelect, disabled }: Props) {
  const { t } = useTranslation();
  const scope = useWorkflowScope();
  const [requested, setRequested] = useState(false);
  const { session } = request;
  const valid = !!(
    session.classId &&
    session.teacherId &&
    session.roomId &&
    session.sessionDate &&
    session.startTime &&
    session.endTime &&
    session.endTime > session.startTime
  );
  const query = useQuery({
    queryKey: ['schedule-suggestions', scope, request],
    queryFn: ({ signal }) => getScheduleSuggestions(request, signal),
    enabled: requested && valid,
    staleTime: 0,
    retry: false,
  });
  return (
    <div className="mt-3 space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || !valid || query.isFetching}
        onClick={() => {
          setRequested(true);
          if (requested) void query.refetch();
        }}
      >
        {t(query.isFetching ? 'common.loading' : 'schedule.suggestions.find')}
      </Button>
      {requested && (
        <div aria-live="polite" className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          {query.isError ? (
            <p>{t('schedule.suggestions.failed')}</p>
          ) : (
            query.data && (
              <>
                <p>
                  {t(
                    query.data.suggestions.length
                      ? 'schedule.suggestions.hint'
                      : 'schedule.suggestions.empty',
                    query.data.window
                  )}
                </p>
                {query.data.suggestions.map((item) => (
                  <button
                    key={`${item.roomId}:${item.startTime}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(item)}
                    className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <span className="min-w-0 break-words font-medium">{item.roomName}</span>
                    <span className="whitespace-nowrap tabular-nums">
                      {item.startTime}–{item.endTime}
                    </span>
                  </button>
                ))}
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
