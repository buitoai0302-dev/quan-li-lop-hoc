import { useState, useMemo, useEffect } from 'react';

export function usePagination<T>(items: T[]) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 5 : 10);

  // Reset to page 1 if items array length drops below current view (e.g. after filtering)
  useEffect(() => {
    const maxPage = Math.ceil(items.length / itemsPerPage);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(maxPage);
    } else if (items.length > 0 && currentPage === 0) {
      setCurrentPage(1);
    }
  }, [items.length, currentPage, itemsPerPage]);

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
