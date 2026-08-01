import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

const modalVariants = cva(
  'relative w-[95%] sm:w-full max-h-[90vh] sm:max-h-[92vh] overflow-hidden transform transition-all flex flex-col mx-auto my-auto animate-in fade-in zoom-in-95 duration-300',
  {
    variants: {
      variant: {
        default:
          'bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl rounded-xl shadow-2xl border border-white/20 dark:border-white/5',
        glass:
          'bg-white/30 dark:bg-white/5 backdrop-blur-3xl rounded-xl border border-white/40 dark:border-white/10 shadow-2xl',
        destructive:
          'bg-white dark:bg-slate-900 rounded-xl shadow-2xl border-t-4 border-t-rose-500',
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
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof modalVariants> {
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

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
        <div
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          onClick={onClose}
        />

        <div
          ref={ref || modalRef}
          className={cn(modalVariants({ variant, size, className }))}
          role="dialog"
          aria-modal="true"
          {...props}
        >
          <div className="flex items-center justify-between px-6 py-2 border-b border-white/10 dark:border-white/5 bg-white/20 dark:bg-white/5 flex-shrink-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate pr-4 uppercase tracking-wider">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-primary dark:hover:text-blue-400 focus:outline-none bg-white/50 dark:bg-white/10 p-1.5 rounded-lg border border-white/20 dark:border-white/5 shadow-sm transition-all active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 bg-transparent">
            {children}
          </div>
        </div>
      </div>,
      document.body
    );
  }
);

Modal.displayName = 'Modal';

export { Modal, modalVariants };
