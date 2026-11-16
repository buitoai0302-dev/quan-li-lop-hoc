import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, ChevronUp, ChevronDown } from 'lucide-react';
import { Card } from '@/components/common/UI';
import PageLoading from '@/components/common/PageLoading';
import type { Session } from '../types';
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';

interface SessionListProps {
  sessions: Session[];
  selectedSession: Session | null;
  sessionsLoading: boolean;
  isSessionsExpanded: boolean;
  setIsSessionsExpanded: (v: boolean) => void;
  onSelectSession: (sessionId: string) => void;
}

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  selectedSession,
  sessionsLoading,
  isSessionsExpanded,
  setIsSessionsExpanded,
  onSelectSession,
}) => {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const sessionsId = React.useId();

  return (
    <div className="flex w-full shrink-0 flex-col lg:h-full lg:w-60 xl:w-72">
      <Card
        className="flex-1 flex flex-col overflow-hidden"
        bodyClassName="max-h-40 lg:max-h-none"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex min-w-0 items-center gap-2">
              <LayoutGrid size={14} className="shrink-0 text-gray-400" />
              <h3 className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                {!isDesktop && !isSessionsExpanded && selectedSession
                  ? selectedSession.class_name
                  : t('attendance.sessions')}
              </h3>
            </div>
            <button
              type="button"
              aria-label={t('attendance.sessions')}
              aria-expanded={isSessionsExpanded}
              aria-controls={sessionsId}
              onClick={() => setIsSessionsExpanded(!isSessionsExpanded)}
              className="-my-2 ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-400 lg:hidden"
            >
              {isSessionsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        }
        scrollable={isSessionsExpanded || isDesktop}
      >
        <div
          id={sessionsId}
          className={`${!isSessionsExpanded && 'hidden lg:block'} space-y-2 p-2 lg:p-3`}
        >
          {sessionsLoading ? (
            <PageLoading />
          ) : sessions.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {t('common.noData')}
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors duration-200 lg:px-4 lg:py-3 ${selectedSession?.id === s.id ? 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-400/35 dark:bg-indigo-400/10 dark:text-indigo-200' : 'border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'}`}
              >
                <div className="font-bold text-sm truncate">{s.class_name}</div>
                <div className="text-[10px] opacity-70 font-medium">
                  {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default SessionList;
