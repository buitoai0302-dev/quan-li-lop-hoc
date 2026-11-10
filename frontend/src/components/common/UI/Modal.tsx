/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { Button } from './Button';

const modalVariants = cva('relative flex flex-col overflow-hidden', {
  variants: {
    placement: {
      center:
        'w-[95%] sm:w-full max-h-[90vh] sm:max-h-[92vh] mx-auto my-auto transform transition-all animate-in fade-in zoom-in-95 duration-300',
      right:
        'h-dvh w-full max-sm:max-w-none motion-safe:animate-[modal-panel-enter_220ms_ease-out]',
    },
    variant: {
      default:
        'bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl rounded-xl shadow-2xl border border-white/20 dark:border-white/5',
      glass:
        'bg-white/30 dark:bg-white/5 backdrop-blur-3xl rounded-xl border border-white/40 dark:border-white/10 shadow-2xl',
      destructive: 'bg-white dark:bg-slate-900 rounded-xl shadow-2xl border-t-4 border-t-rose-500',
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
    placement: 'center',
  },
});

let scrollLockCount = 0;
let previousBodyOverflow = '';
const PANEL_EXIT_DURATION_MS = 180;

export interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof modalVariants> {
  isOpen: boolean;
  onClose: () => void;
  onAfterClose?: () => void;
  title: string;
  closeLabel?: string;
  width?: React.CSSProperties['width'];
  bodyClassName?: string;
  backdrop?: 'transparent' | 'dim' | 'none';
  closeOnBackdropClick?: boolean;
  footer?: React.ReactNode | ((requestClose: () => void) => React.ReactNode);
  closeBlocked?: boolean;
  confirmCloseMessage?: string;
  hasUnsavedChanges?: boolean;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      className,
      variant,
      size,
      placement = 'center',
      width,
      bodyClassName,
      backdrop = placement === 'right' ? 'transparent' : 'dim',
      closeOnBackdropClick = placement !== 'right',
      footer,
      closeBlocked = false,
      confirmCloseMessage,
      hasUnsavedChanges = false,
      isOpen,
      onClose,
      onAfterClose,
      title,
      closeLabel = 'Đóng / Close',
      children,
      style,
      onChangeCapture,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [isConfirmingClose, setIsConfirmingClose] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const dirtyRef = useRef(false);
    const [panelContent, setPanelContent] = useState<Pick<
      ModalProps,
      'title' | 'children' | 'footer'
    > | null>(null);
    const titleId = useId();
    const confirmMessageId = useId();
    const isPanel = placement === 'right';
    const isExiting = !isOpen && isPanel && panelContent !== null;
    const isRendered = isOpen || isExiting;
    const isModal = backdrop !== 'none';
    const panelWidth = typeof width === 'number' ? `${width}px` : width;
    const panelStyle = { ...style, '--modal-panel-width': panelWidth } as React.CSSProperties;
    const notifyPanelClosed = React.useEffectEvent(() => onAfterClose?.());

    // Retain the last open content when a caller closes and resets its form together.
    if (
      isOpen &&
      isPanel &&
      (panelContent?.title !== title ||
        panelContent.children !== children ||
        panelContent.footer !== footer)
    ) {
      setPanelContent({ title, children, footer });
    }

    useLayoutEffect(() => {
      if (!isExiting) return;
      const panel = modalRef.current;
      let cancelled = false;
      const finish = () => {
        if (cancelled) return;
        setPanelContent(null);
        notifyPanelClosed();
      };
      const animation =
        panel?.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? panel.animate(
              [{ transform: getComputedStyle(panel).transform }, { transform: 'translateX(100%)' }],
              {
                duration: PANEL_EXIT_DURATION_MS,
                easing: 'ease-in',
                fill: 'forwards',
              }
            )
          : null;
      if (animation) void animation.finished.then(finish, finish);
      else queueMicrotask(finish);
      return () => {
        cancelled = true;
        animation?.cancel();
      };
    }, [isExiting]);

    const requestClose = () => {
      if (!isOpen || closeBlocked) return;
      if (confirmCloseMessage && (dirtyRef.current || hasUnsavedChanges)) {
        setIsConfirmingClose(true);
        return;
      }
      onClose();
    };
    const closeOnEscape = React.useEffectEvent(requestClose);

    useEffect(() => {
      if (!isRendered) return;
      const opener = document.activeElement as HTMLElement | null;
      const dialog = modalRef.current;
      const focusable = () =>
        Array.from(
          dialog?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          ) || []
        ).filter((el) => el.getClientRects().length > 0);
      (focusable()[0] || dialog)?.focus();
      if (isModal && scrollLockCount++ === 0) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      const onKeyDown = (e: KeyboardEvent) => {
        const dialogs = document.querySelectorAll('[data-ui-dialog]');
        if (dialogs[dialogs.length - 1] !== dialog) return;
        if (dialog?.inert) {
          if (e.key === 'Escape' || (isModal && e.key === 'Tab')) e.preventDefault();
          return;
        }
        if (!isModal && !dialog?.contains(document.activeElement)) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          closeOnEscape();
          return;
        }
        if (!isModal || e.key !== 'Tab') return;
        const items = focusable();
        if (!items.length) {
          e.preventDefault();
          dialog?.focus();
          return;
        }
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        if (isModal && --scrollLockCount === 0) document.body.style.overflow = previousBodyOverflow;
        dirtyRef.current = false;
        const dialogs = document.querySelectorAll<HTMLElement>('[data-ui-dialog]');
        const top = dialogs[dialogs.length - 1];
        if (opener?.isConnected && (!top || top.contains(opener))) opener.focus();
      };
    }, [isRendered, isModal]);

    if (!isOpen && isConfirmingClose) setIsConfirmingClose(false);
    if (!isRendered) return null;
    const visibleContent = isExiting ? panelContent : { title, children, footer };

    return createPortal(
      <div
        className={cn(
          'pointer-events-none fixed inset-0 z-[9999] flex',
          isPanel ? 'justify-end' : 'items-center justify-center p-2 sm:p-4'
        )}
      >
        {isModal && (
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-auto fixed inset-0',
              backdrop === 'dim' &&
                'bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in'
            )}
            onClick={closeOnBackdropClick ? requestClose : undefined}
          />
        )}

        <div
          ref={(node) => {
            modalRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn(
            modalVariants({ variant, size, placement }),
            'pointer-events-auto',
            isPanel &&
              'rounded-none border-y-0 border-r-0 border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 backdrop-blur-none',
            isPanel &&
              panelWidth !== undefined &&
              'sm:w-[var(--modal-panel-width)] sm:max-w-[100vw]',
            className
          )}
          style={isPanel ? panelStyle : style}
          data-ui-dialog=""
          role="dialog"
          aria-modal={isModal || undefined}
          aria-labelledby={titleId}
          inert={isExiting}
          tabIndex={-1}
          onChangeCapture={(event) => {
            if (
              confirmCloseMessage &&
              event.target instanceof HTMLElement &&
              event.currentTarget.contains(event.target)
            )
              dirtyRef.current = true;
            onChangeCapture?.(event);
          }}
          {...props}
        >
          <div className="flex items-center justify-between px-6 py-2 border-b border-white/10 dark:border-white/5 bg-white/20 dark:bg-white/5 flex-shrink-0">
            <h3
              id={titleId}
              className={cn(
                'pr-4 text-sm font-bold text-slate-900 sm:text-base dark:text-white',
                isPanel ? 'break-words' : 'truncate uppercase tracking-wider'
              )}
            >
              {visibleContent.title}
            </h3>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={requestClose}
              disabled={closeBlocked}
              className="min-w-11 min-h-11 flex items-center justify-center text-slate-500 hover:text-primary dark:hover:text-blue-400 focus-visible:outline-2 focus-visible:outline-primary bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <div
            className={cn(
              'px-6 py-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 bg-transparent',
              isPanel && 'overscroll-contain px-4 sm:px-6',
              bodyClassName
            )}
          >
            {visibleContent.children}
          </div>
          {visibleContent.footer && (
            <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 dark:border-slate-800 dark:bg-slate-900">
              {typeof visibleContent.footer === 'function'
                ? visibleContent.footer(requestClose)
                : visibleContent.footer}
            </div>
          )}
        </div>
        {isOpen && isConfirmingClose && confirmCloseMessage && (
          <Modal
            isOpen
            onClose={() => setIsConfirmingClose(false)}
            title={t('common.unsavedChanges')}
            closeLabel={t('common.close')}
            aria-describedby={confirmMessageId}
            size="sm"
          >
            <p id={confirmMessageId} className="text-sm text-slate-700 dark:text-slate-200">
              {confirmCloseMessage}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConfirmingClose(false)}>
                {t('common.continueEditing')}
              </Button>
              <Button
                variant="destructive"
                disabled={closeBlocked}
                onClick={() => {
                  setIsConfirmingClose(false);
                  onClose();
                }}
              >
                {t('common.discardChanges')}
              </Button>
            </div>
          </Modal>
        )}
      </div>,
      document.body
    );
  }
);

Modal.displayName = 'Modal';

export { Modal, modalVariants };
