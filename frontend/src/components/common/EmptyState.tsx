import React from 'react';
import { type LucideIcon, Search } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Search,
  title,
  description,
  action
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center animate-in fade-in zoom-in duration-500">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100 dark:border-gray-800">
        <Icon size={32} className="text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-8 font-medium leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="animate-in slide-in-from-bottom-2 duration-700">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
