import { useState, useCallback } from 'react';

export function useSelection<T extends { id: string }>(paginatedItems: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const pageItemIds = paginatedItems.map((item) => item.id);

      if (checked) {
        setSelectedIds((prev) => Array.from(new Set([...prev, ...pageItemIds])));
      } else {
        setSelectedIds((prev) => prev.filter((id) => !pageItemIds.includes(id)));
      }
    },
    [paginatedItems]
  );

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    selectedIds,
    handleSelectAll,
    handleSelectOne,
    clearSelection,
  };
}
