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
  children,
}) => {
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <div className="filter-enter grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] items-center gap-2 lg:flex">
      {/* Search Input */}
      <div className="relative min-w-0 flex-1 lg:max-w-md">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={14}
        />
        <input
          type="search"
          aria-label={searchPlaceholder || t('common.search')}
          placeholder={searchPlaceholder || t('common.search')}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-2 text-base font-medium text-gray-900 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-slate-400 sm:text-sm lg:h-9"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Extra Filters (Selects, etc.) */}
      {children}
    </div>
  );
};

export default FilterBar;
