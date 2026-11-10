import { useId, useRef, type ReactNode } from 'react';
import { EllipsisVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ActionHint from './ActionHint';

interface RowAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: 'danger' | 'primary';
  mobilePrimary?: boolean;
}

export default function RowActions({ actions }: { actions: RowAction[] }) {
  const { t } = useTranslation();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const primaryAction = actions.find((action) => action.mobilePrimary);

  return (
    <>
      <div className="hidden items-center justify-end gap-1 sm:flex">
        {actions.map(({ label, icon, onClick, tone }) => (
          <ActionHint key={label} label={label} showTouchLabel={false}>
            <button
              type="button"
              onClick={onClick}
              className={`grid size-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${tone === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-primary dark:text-indigo-300'}`}
            >
              <span aria-hidden="true">{icon}</span>
            </button>
          </ActionHint>
        ))}
      </div>
      <div className="inline-flex items-center justify-end sm:hidden">
        {primaryAction && (
          <button
            type="button"
            aria-label={primaryAction.label}
            onClick={primaryAction.onClick}
            className="inline-grid size-11 place-items-center rounded-lg text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary dark:text-indigo-300"
          >
            <span aria-hidden="true">{primaryAction.icon}</span>
          </button>
        )}
        <button
          type="button"
          aria-label={t('common.moreActions')}
          popoverTarget={menuId}
          onClick={({ currentTarget }) => {
            const menu = menuRef.current;
            if (!menu) return;
            const rect = currentTarget.getBoundingClientRect();
            const { clientHeight, clientWidth } = document.documentElement;
            const openAbove = rect.bottom > clientHeight / 2;
            menu.style.setProperty('--menu-enter-offset', openAbove ? '4px' : '-4px');
            menu.style.right = `${Math.max(8, clientWidth - rect.right)}px`;
            menu.style.top = openAbove ? 'auto' : `${rect.bottom + 4}px`;
            menu.style.bottom = openAbove ? `${clientHeight - rect.top + 4}px` : 'auto';
          }}
          className="inline-grid size-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <EllipsisVertical aria-hidden="true" size={18} />
        </button>
      </div>
      <div
        id={menuId}
        ref={menuRef}
        popover="auto"
        className="menu-enter fixed left-auto m-0 w-52 max-w-[calc(100vw-1rem)] max-h-[calc(50dvh-1rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:hidden"
      >
        {actions
          .filter((action) => !action.mobilePrimary)
          .map(({ label, icon, onClick, tone }) => (
            <button
              key={label}
              type="button"
              className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary dark:hover:bg-slate-800 ${tone === 'danger' ? 'text-rose-600 dark:text-rose-400' : ''}`}
              onClick={() => {
                menuRef.current?.hidePopover();
                onClick();
              }}
            >
              <span aria-hidden="true" className="shrink-0">
                {icon}
              </span>
              {label}
            </button>
          ))}
      </div>
    </>
  );
}
