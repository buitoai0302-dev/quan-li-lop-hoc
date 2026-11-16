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
    <div className="flex min-h-56 flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:min-h-80 sm:p-10">
      {illustration ? (
        <div className="mb-4 w-full max-w-[200px]">{illustration}</div>
      ) : (
        <div
          aria-hidden="true"
          className="mb-4 grid size-14 place-items-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          <Icon size={24} />
        </div>
      )}

      <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-5 flex flex-col items-center gap-2">
          {showArrow && (
            <CornerRightDown
              aria-hidden="true"
              size={20}
              className="hidden text-gray-400 sm:block"
            />
          )}
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
