import React from 'react';
import { type LucideIcon, Search, CornerRightDown } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  showArrow?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Search,
  illustration,
  title,
  description,
  action,
  showArrow = false,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center animate-in fade-in zoom-in duration-500 min-h-[400px]">
      {illustration ? (
        <div className="mb-6 max-w-[200px] opacity-90 hover:opacity-100 transition-opacity duration-300 drop-shadow-md">
          {illustration}
        </div>
      ) : (
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100 dark:border-gray-800">
          <Icon size={32} className="text-gray-300 dark:text-gray-600" />
        </div>
      )}
      
      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8 font-medium leading-relaxed">
          {description}
        </p>
      )}
      
      {action && (
        <div className="relative animate-in slide-in-from-bottom-2 duration-700">
          {showArrow && (
            <div className="absolute -top-12 -right-12 hidden sm:block animate-bounce text-primary/50">
              <CornerRightDown size={32} strokeWidth={2.5} />
            </div>
          )}
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
