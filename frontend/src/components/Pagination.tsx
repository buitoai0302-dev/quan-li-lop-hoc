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

  if (totalItems <= 5) return null;

  return (
    <div className="flex flex-row items-center justify-center sm:justify-between px-2 py-2 mt-2 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 gap-4 sm:gap-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
            {t('pagination.rowsPerPage')}
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="bg-transparent border-none text-[10px] font-black text-primary focus:ring-0 p-0 cursor-pointer appearance-none pr-4 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236366f1%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px] bg-[right_center] bg-no-repeat"
          >
            {[5, 10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        
        <div className="hidden xs:block text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
          {totalItems > 0 && t('pagination.showing', { start: startIndex, end: endIndex, total: totalItems })}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        
        <div className="flex items-center px-4 py-1.5 rounded-lg bg-primary/5 dark:bg-primary/10 text-[10px] sm:text-[11px] font-black text-primary border border-primary/10">
          {currentPage} <span className="mx-1.5 opacity-30">/</span> {totalPages}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalItems === 0}
          className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
