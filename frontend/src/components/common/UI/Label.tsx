import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const labelVariants = cva(
  'font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 block transition-colors group-focus-within:text-primary',
  {
    variants: {
      size: {
        default: 'text-[11px]',
        xs: 'text-[10px]',
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
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  }
);
Label.displayName = 'Label';

export { Label };
