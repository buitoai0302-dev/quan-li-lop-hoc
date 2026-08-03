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
    <div className="relative z-[60] w-full shrink-0 py-2.5 animate-in fade-in slide-in-from-top-2 duration-500 border border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-4 mb-3 rounded-xl shadow-sm">
      <div className="flex flex-col">
        {/* Main Row: Icon + Desktop Filters + Actions */}
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg text-primary shrink-0 flex items-center justify-center">
              <Icon size={18} className="sm:w-5 sm:h-5" />
            </div>
          </div>

          {/* Desktop Filters - Hidden on mobile, shown in middle on desktop */}
          {children && <div className="hidden lg:block flex-1 max-w-2xl px-4">{children}</div>}

          {actions && <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">{actions}</div>}
        </div>

        {/* Mobile Filters - Shown below title on mobile and tablet only if children exist */}
        {children && <div className="lg:hidden pt-2">{children}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
