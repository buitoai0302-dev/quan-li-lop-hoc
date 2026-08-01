import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const cardVariants = cva(
  'rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-300',
  {
    variants: {
      variant: {
        default:
          'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/50 shadow-sm',
        glass:
          'bg-white/40 dark:bg-gray-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-gray-700/50 shadow-xl',
        outline: 'bg-transparent border-2 border-gray-100 dark:border-slate-800 shadow-none',
        ghost: 'bg-transparent border-transparent shadow-none',
        primary: 'bg-primary/5 border border-primary/20 shadow-none',
        muted:
          'bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 shadow-inner',
      },
      hover: {
        true: 'hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      hover: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  bodyClassName?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, header, footer, scrollable, bodyClassName, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(cardVariants({ variant, hover, className }))} {...props}>
        {header && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800/50 bg-gray-50/50 dark:bg-slate-950/20 shrink-0">
            {header}
          </div>
        )}

        <div className={cn(
          'flex-1 flex flex-col min-h-0', 
          scrollable && 'overflow-y-auto custom-scrollbar',
          bodyClassName
        )}>
          {children}
        </div>

        {footer && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800/50 bg-gray-50/50 dark:bg-slate-950/20 shrink-0">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card, cardVariants };
