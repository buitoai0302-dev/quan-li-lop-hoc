import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import ActionHint from './ActionHint';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];
const PAGE_BUTTON_CLASS =
  'grid size-11 shrink-0 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-600 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400 dark:disabled:hover:text-gray-300';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const { t } = useTranslation();

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems <= PAGE_SIZE_OPTIONS[0] && currentPage === 1) return null;

  return (
    <nav
      aria-label={t('pagination.label')}
      className="flex w-full items-center justify-between gap-2 sm:flex-wrap sm:gap-x-6 sm:gap-y-3"
    >
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
        <span className="sr-only sm:not-sr-only">{t('pagination.rowsPerPage')}</span>
        <span className="relative">
          <select
            value={itemsPerPage}
            onChange={(event) => onItemsPerPageChange(Number(event.target.value))}
            className="min-h-11 min-w-14 appearance-none rounded-lg border border-gray-200 bg-white py-1 pl-2 pr-6 text-sm font-semibold tabular-nums text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:min-w-17 sm:pl-3 sm:pr-8"
          >
            {PAGE_SIZE_OPTIONS.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
          />
        </span>
      </label>

      <div
        className={`flex min-w-0 items-center gap-1 sm:gap-2 ${totalPages === 1 ? 'max-sm:[&>.action-hint]:hidden!' : ''}`}
      >
        <ActionHint label={t('pagination.previous')} showTouchLabel={false}>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={PAGE_BUTTON_CLASS}
          >
            <ChevronLeft aria-hidden="true" size={20} />
          </button>
        </ActionHint>

        <div
          role="status"
          className="text-center text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200 sm:min-w-24 sm:text-sm"
        >
          <div className={totalPages === 1 ? 'sr-only sm:not-sr-only' : undefined}>
            {t('pagination.page', { page: currentPage, totalPages })}
          </div>
          <div
            className={`text-xs font-normal text-gray-600 dark:text-gray-300 ${totalPages > 1 ? 'sr-only sm:not-sr-only' : ''}`}
          >
            {totalItems > 0
              ? t('pagination.showing', { start: startIndex, end: endIndex, total: totalItems })
              : t('pagination.noData')}
          </div>
        </div>

        <ActionHint label={t('pagination.next')} showTouchLabel={false}>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={PAGE_BUTTON_CLASS}
          >
            <ChevronRight aria-hidden="true" size={20} />
          </button>
        </ActionHint>
      </div>
    </nav>
  );
};

export default Pagination;
