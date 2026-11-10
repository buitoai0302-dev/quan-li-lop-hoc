import React from 'react';
import { useTranslation } from 'react-i18next';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

const SkeletonTable: React.FC<SkeletonTableProps> = ({ rows = 5, columns = 5 }) => {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    >
      <span className="sr-only">{t('common.loadingData')}</span>
      <div aria-hidden="true" className="overflow-hidden motion-safe:animate-pulse">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={`th-${i}`} className="p-2 sm:p-4">
                  <div className="h-4 w-full max-w-24 rounded bg-gray-200 dark:bg-gray-700" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={`tr-${rowIndex}`}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={`td-${rowIndex}-${colIndex}`} className="p-2 sm:p-4">
                    <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        aria-hidden="true"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 p-3 motion-safe:animate-pulse dark:border-gray-700 sm:p-4"
      >
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-2">
          <div className="size-11 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-11 w-24 rounded-lg bg-gray-100 dark:bg-gray-700" />
          <div className="size-11 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonTable;
