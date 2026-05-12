import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/utils/cn';

const inputVariants = cva(
  'flex w-full rounded-xl border font-medium transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:placeholder:text-gray-500',
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

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, size, variant, ...props }, ref) => {
    return (
      <div className="relative group w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors duration-200">
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, {
                  size: size === 'xs' ? 12 : size === 'sm' ? 14 : 16,
                })
              : icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            inputVariants({ variant, size, className }),
            icon && (size === 'xs' ? 'pl-8' : 'pl-10')
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
