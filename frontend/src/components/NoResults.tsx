import React from 'react';
import { SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NoResultsProps {
  title?: string;
  subtitle?: string;
  colSpan?: number;
  isTable?: boolean;
}

const NoResults: React.FC<NoResultsProps> = ({ title, subtitle, colSpan = 5, isTable = true }) => {
  const { t } = useTranslation();

  const content = (
    <div className="flex flex-col items-center justify-center space-y-4 py-12 animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
        <div className="relative bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700">
          <SearchX size={40} className="text-gray-300 dark:text-gray-600" />
        </div>
      </div>
      <div className="space-y-1 text-center">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
          {title || t('common.noResults')}
        </h3>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 max-w-[240px] mx-auto leading-relaxed">
          {subtitle || t('common.noResultsSub')}
        </p>
      </div>
    </div>
  );

  if (isTable) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 text-center">
          {content}
        </td>
      </tr>
    );
  }

  return content;
};

export default NoResults;
