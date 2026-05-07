import React from 'react';
import { SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NoResultsProps {
  title?: string;
  subtitle?: string;
  colSpan?: number;
}

const NoResults: React.FC<NoResultsProps> = ({ title, subtitle, colSpan = 5 }) => {
  const { t } = useTranslation();

  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
              <SearchX size={40} className="text-gray-300 dark:text-gray-600 animate-bounce-slow" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
              {title || t('common.noResults')}
            </h3>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 max-w-[240px] mx-auto leading-relaxed">
              {subtitle || t('common.noResultsSub')}
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default NoResults;
