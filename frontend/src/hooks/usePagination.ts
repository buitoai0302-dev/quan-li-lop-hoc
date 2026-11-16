import { useMemo, useEffect } from 'react';
import { useWorkflowState, isPageNumber, isPageSize } from './useWorkflowState';

export function usePagination<T>(items: T[], screen?: string, ready = true) {
  const [currentPage, setCurrentPage] = useWorkflowState(screen, 'page', 1, isPageNumber);
  const [itemsPerPage, setItemsPerPage] = useWorkflowState(
    screen,
    'pageSize',
    window.innerWidth < 768 ? 5 : 10,
    isPageSize
  );

  // Reset to page 1 if items array length drops below current view (e.g. after filtering)
  useEffect(() => {
    if (!ready) return;
    const maxPage = Math.max(1, Math.ceil(items.length / itemsPerPage));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    } else if (items.length > 0 && currentPage === 0) {
      setCurrentPage(1);
    }
  }, [items.length, currentPage, itemsPerPage, ready, setCurrentPage]);

  const paginatedItems = useMemo(() => {
    return items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedItems,
  };
}
