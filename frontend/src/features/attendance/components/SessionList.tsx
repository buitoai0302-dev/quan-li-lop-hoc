import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, ChevronUp, ChevronDown } from 'lucide-react';
import { Card } from '@/components/common/UI';
import PageLoading from '@/components/common/PageLoading';
import type { Session } from '../types';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const sessionsId = React.useId();

  return (
    <div
      className={`w-full lg:w-60 xl:w-72 lg:h-full shrink-0 flex flex-col motion-safe:transition-[height] motion-safe:duration-200 ${isSessionsExpanded ? 'h-[200px] sm:h-[240px] lg:h-full' : 'h-12 lg:h-full'}`}
    >
      <Card
        className="flex-1 flex flex-col overflow-hidden"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <LayoutGrid size={14} className="text-gray-400" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t('attendance.sessions')}
              </h3>
            </div>
            <button
              type="button"
              aria-label={t('attendance.sessions')}
              aria-expanded={isSessionsExpanded}
              aria-controls={sessionsId}
              onClick={() => setIsSessionsExpanded(!isSessionsExpanded)}
              className="-my-2 inline-flex size-11 items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-lg focus-visible:outline-2 focus-visible:outline-primary lg:hidden"
            >
              {isSessionsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        }
        scrollable={isSessionsExpanded || isDesktop}
      >
        <div
          id={sessionsId}
          className={`${!isSessionsExpanded && 'hidden lg:block'} p-3 space-y-2`}
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
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${selectedSession?.id === s.id ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-600 dark:text-gray-400'}`}
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
