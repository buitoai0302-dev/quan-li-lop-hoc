import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  subtitle?: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ icon: Icon, actions, children }) => {
  return (
    <div className="w-full shrink-0 pt-1 pb-3 animate-in fade-in slide-in-from-top-2 duration-500 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm px-1 mb-2">
      <div className="flex flex-col gap-4">
        {/* Main Row */}
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg text-primary shrink-0">
              <Icon size={18} className="sm:w-5 sm:h-5" />
            </div>
          </div>

          {/* Desktop Filters - Hidden on mobile, shown in middle on desktop */}
          <div className="hidden lg:block flex-1 max-w-2xl px-4">
            {children}
          </div>

          {actions && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Mobile Filters - Shown below title on mobile and tablet */}
        <div className="lg:hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
