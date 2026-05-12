import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';

const selectVariants = cva(
  'flex w-full rounded-xl border font-medium transition-all duration-200 appearance-none focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 pr-10',
  {
    variants: {
      variant: {
        default:
          'border-gray-200 bg-white focus-visible:ring-primary/20 focus-visible:border-primary/30 dark:border-slate-800 dark:bg-slate-900',
        muted: 'border-none bg-gray-50 focus-visible:ring-primary/40 dark:bg-gray-900',
        white: 'border-none bg-white focus-visible:ring-primary/40 dark:bg-gray-800',
      },
      size: {
        default: 'h-11 px-3 text-sm',
        sm: 'h-9 px-2.5 text-xs',
        xs: 'h-8 px-2 text-[11px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface SelectProps
  extends
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  icon?: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, icon, size, variant, ...props }, ref) => {
    return (
      <div className="relative group w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors duration-200 pointer-events-none z-10">
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, {
                  size: size === 'xs' ? 12 : size === 'sm' ? 14 : 16,
                })
              : icon}
          </div>
        )}
        <select
          className={cn(
            selectVariants({ variant, size, className }),
            icon && (size === 'xs' ? 'pl-8' : 'pl-10')
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 group-focus-within:rotate-180 group-focus-within:text-primary">
          <ChevronDown size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} strokeWidth={3} />
        </div>
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
