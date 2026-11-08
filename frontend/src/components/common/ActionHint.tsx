import { cloneElement, useEffect, useState, type HTMLAttributes, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

type HintControl = ReactElement<HTMLAttributes<HTMLElement>>;

interface ActionHintProps {
  label: string;
  touchLabel?: string;
  fullWidth?: boolean;
  enabled?: boolean;
  showTouchLabel?: boolean;
  children: HintControl;
}

interface HintPosition {
  x: number;
  y: number;
  above: boolean;
}

/** A desktop tooltip with a persistent label on touch and narrow screens. */
export default function ActionHint({
  label,
  touchLabel,
  fullWidth = false,
  enabled = true,
  showTouchLabel = true,
  children,
}: ActionHintProps) {
  const [position, setPosition] = useState<HintPosition | null>(null);

  useEffect(() => {
    if (!position) return;
    const dismiss = () => setPosition(null);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [position]);

  const show = (control: HTMLElement) => {
    if (control instanceof HTMLButtonElement && control.disabled) return;
    const rect = control.getBoundingClientRect();
    setPosition({
      x: Math.max(64, Math.min(window.innerWidth - 64, rect.left + rect.width / 2)),
      y: window.innerHeight - rect.bottom < 64 ? rect.top - 8 : rect.bottom + 8,
      above: window.innerHeight - rect.bottom < 64,
    });
  };

  return (
    <span
      className={fullWidth ? 'action-hint action-hint--full' : 'action-hint'}
      onMouseEnter={(event) => {
        if (enabled && window.matchMedia('(hover: hover)').matches) {
          const control = event.currentTarget.querySelector<HTMLElement>('button, a');
          if (control) show(control);
        }
      }}
      onMouseLeave={() => setPosition(null)}
      onFocus={(event) => {
        if (
          enabled &&
          event.target instanceof HTMLElement &&
          event.target.matches('button:focus-visible, a:focus-visible')
        ) {
          show(event.target);
        }
      }}
      onBlur={() => setPosition(null)}
    >
      {cloneElement(children, {
        title: undefined,
        'aria-label': children.props['aria-label'] || (enabled ? label : undefined),
      })}
      {enabled && showTouchLabel && (
        <span className="action-hint__touch-label" aria-hidden="true">
          {touchLabel || label}
        </span>
      )}
      {position &&
        createPortal(
          <span
            className="action-hint__popup"
            style={{
              left: position.x,
              top: position.y,
              transform: position.above ? 'translate(-50%, -100%)' : 'translateX(-50%)',
            }}
            aria-hidden="true"
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
