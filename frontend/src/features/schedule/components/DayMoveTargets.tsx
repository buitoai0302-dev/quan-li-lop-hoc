import { addDays, format, isSameDay } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import DroppableDaySlot from './DroppableDaySlot';

const MOVE_DAY_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];

export default function DayMoveTargets({ selectedDate }: { selectedDate: Date }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? vi : enUS;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-2 sm:p-3">
      <div
        role="group"
        aria-label={t('schedule.moveToDate')}
        className="pointer-events-auto w-full max-w-xl rounded-xl border border-primary/30 bg-white p-2 shadow-lg dark:bg-slate-900"
      >
        <p className="mb-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('schedule.dropOnDate')}
        </p>
        <div className="grid grid-cols-7 gap-1">
          {MOVE_DAY_OFFSETS.map((offset) => {
            const day = addDays(selectedDate, offset);
            const date = format(day, 'yyyy-MM-dd');
            const isCurrentDay = isSameDay(day, selectedDate);
            return (
              <DroppableDaySlot
                key={date}
                id={`move-${date}`}
                date={date}
                previewBelow
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border text-center ${isCurrentDay ? 'border-primary/40 bg-primary/10 text-primary dark:text-indigo-300' : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
              >
                <span className="text-[10px] sm:text-xs">{format(day, 'EEE', { locale })}</span>
                <span className="text-xs font-semibold tabular-nums">{format(day, 'dd/MM')}</span>
              </DroppableDaySlot>
            );
          })}
        </div>
      </div>
    </div>
  );
}
