import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const labelVariants = cva(
  'mb-1.5 block font-semibold text-slate-700 transition-colors group-focus-within:text-primary dark:text-slate-200',
  {
    variants: {
      size: {
        default: 'text-sm',
        xs: 'text-xs',
        sm: 'text-xs',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>, VariantProps<typeof labelVariants> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, size, ...props }, ref) => {
    return (
      <label ref={ref} className={cn(labelVariants({ size, className }))} {...props}>
        {children}
        {required && (
          <span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">
            *
          </span>
        )}
      </label>
    );
  }
);
Label.displayName = 'Label';

export { Label };
