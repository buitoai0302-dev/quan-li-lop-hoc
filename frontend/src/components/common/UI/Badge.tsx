import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-black uppercase tracking-tighter transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 select-none backdrop-blur-md',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-slate-900/80 text-slate-50 hover:bg-slate-900 dark:bg-slate-50/80 dark:text-slate-900 dark:hover:bg-slate-50',
        secondary:
          'border-transparent bg-slate-100/70 text-slate-900 hover:bg-slate-200 dark:bg-slate-800/70 dark:text-slate-50 dark:hover:bg-slate-700',
        destructive:
          'border-transparent bg-rose-500/80 text-slate-50 hover:bg-rose-600 shadow-sm shadow-rose-500/20',
        outline: 'text-slate-950 border border-slate-200/50 dark:text-slate-50 dark:border-slate-800/50',
        success:
          'bg-green-100/50 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200/30 dark:border-green-800/30',
        warning:
          'bg-amber-100/50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200/30 dark:border-amber-800/30',
        info: 'bg-blue-100/50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200/30 dark:border-blue-800/30',
        muted: 'bg-gray-100/50 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400 border border-gray-200/30 dark:border-gray-600/30',
        ghost: 'border-transparent bg-transparent',
        primary:
          'border-transparent bg-primary/80 text-white hover:bg-primary shadow-lg shadow-primary/20 border-t border-white/20',
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
