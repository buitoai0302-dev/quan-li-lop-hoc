import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';

const PageLoading: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      className="flex min-h-56 flex-1 flex-col items-center justify-center px-4 py-8 sm:min-h-80"
    >
      <div
        aria-hidden="true"
        className="relative grid size-14 place-items-center text-primary dark:text-blue-400"
      >
        <div className="absolute inset-0 rounded-full border-4 border-current opacity-20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-current motion-safe:animate-spin" />
        <BookOpen size={24} />
      </div>
      <p className="mt-4 text-center text-sm font-medium text-gray-600 dark:text-gray-300">
        {t('common.loadingData')}
      </p>
    </div>
  );
};

export default PageLoading;
