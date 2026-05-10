import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FilterBarProps {
  isVisible: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

const FilterBar: React.FC<FilterBarProps> = ({
  isVisible,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  children
}) => {
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      {/* Search Input */}
      <div className="relative flex-1 sm:min-w-[240px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <input
          type="text"
          placeholder={searchPlaceholder || t('common.search')}
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Extra Filters (Selects, etc.) */}
      {children && (
        <div className="flex flex-col sm:flex-row gap-3">
          {children}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
