import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-black uppercase tracking-tighter transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/80',
        secondary:
          'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80',
        destructive:
          'border-transparent bg-rose-500 text-slate-50 hover:bg-rose-500/80 dark:bg-rose-900 dark:text-slate-50 dark:hover:bg-rose-900/80',
        outline: 'text-slate-950 border border-slate-200 dark:text-slate-50 dark:border-slate-800',
        success:
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent',
        warning:
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-transparent',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-transparent',
        muted: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-transparent',
        ghost: 'border-transparent bg-transparent',
        primary:
          'border-transparent bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20',
      },
      size: {
        default: 'px-2 py-0.5 text-[9px]',
        xs: 'px-1.5 py-0 text-[8px]',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
