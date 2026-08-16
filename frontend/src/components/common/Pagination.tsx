import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  if (totalItems <= 5 && currentPage === 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 sm:gap-4 transition-all duration-300">
      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-2">
          <span className="text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {t('pagination.rowsPerPage')}
          </span>
          <div className="relative group">
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="bg-gray-100/50 dark:bg-gray-800/50 border-none text-[10px] sm:text-[11px] font-black text-primary dark:text-blue-400 focus:ring-2 focus:ring-primary/20 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 cursor-pointer appearance-none pr-6 sm:pr-8 transition-all hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
            >
              {[5, 10, 20, 50, 100].map((v) => (
                <option key={v} value={v} className="dark:bg-slate-900">
                  {v}
                </option>
              ))}
            </select>
            <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 pointer-events-none text-primary/50 group-hover:text-primary transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="text-[9px] sm:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
          {totalItems > 0 && (
            <span className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-primary dark:text-blue-400">
                {startIndex}-{endIndex}
              </span>
              <span className="opacity-50">/</span>
              <span>{totalItems}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-primary dark:hover:text-blue-400 hover:shadow-lg hover:shadow-primary/10 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90"
          title={t('common.previous')}
        >
          <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={3} />
        </button>

        <div className="flex items-center px-3 sm:px-4 h-8 sm:h-9 rounded-lg sm:rounded-xl bg-primary/5 dark:bg-blue-500/10 text-[10px] sm:text-[11px] font-black text-primary dark:text-blue-400 border border-primary/20 dark:border-blue-400/20 shadow-sm min-w-[70px] sm:min-w-[80px] justify-center tracking-tighter">
          {currentPage} <span className="mx-1.5 sm:mx-2 opacity-30 font-normal">/</span>{' '}
          {totalPages}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalItems === 0}
          className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-primary dark:hover:text-blue-400 hover:shadow-lg hover:shadow-primary/10 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90"
          title={t('common.next')}
        >
          <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
