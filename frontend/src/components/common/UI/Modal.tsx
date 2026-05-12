import React, { useEffect, useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

const modalVariants = cva(
  'relative w-full max-w-[calc(100%-2rem)] max-h-[90vh] sm:max-h-[calc(100vh-100px)] overflow-hidden transform transition-all flex flex-col mx-auto mb-4 sm:mb-0',
  {
    variants: {
      variant: {
        default:
          'bg-white dark:bg-gray-800 rounded-xl shadow-2xl border sm:border-0 dark:border-gray-700',
        glass:
          'bg-white/40 dark:bg-gray-800/50 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/50 dark:border-gray-700/50 shadow-xl',
        destructive: 'bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-t-4 border-t-rose-500',
      },
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'lg',
    },
  }
);

export interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof modalVariants> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ className, variant, size, isOpen, onClose, title, children, ...props }, ref) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-1 sm:p-2">
        <div
          className="fixed inset-0 bg-gray-900/70 backdrop-blur-[3px] transition-opacity duration-300"
          onClick={onClose}
        />

        <div
          ref={ref || modalRef}
          className={cn(modalVariants({ variant, size, className }))}
          role="dialog"
          aria-modal="true"
          {...props}
        >
          <div className="flex items-center justify-between px-5 py-1 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
            <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate pr-4 uppercase tracking-wider">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-all active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-1 sm:py-2 overflow-y-auto custom-scrollbar flex-1">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

export { Modal, modalVariants };
