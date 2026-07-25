'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  actions?: ModalAction[];
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
  'aria-label'?: string;
  className?: string;
}

const MODAL_WIDTHS: Record<'sm' | 'md' | 'lg', string> = {
  sm: '400px',
  md: '600px',
  lg: '800px',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  actions,
  size = 'md',
  closeOnBackdrop = true,
  'aria-label': ariaLabel,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    (focusable ?? dialog)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'));
      if (controls.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: 'var(--ua-backdrop)',
        backdropFilter: 'blur(4px)',
        zIndex: 'var(--ua-z-modal)' as unknown as number,
      }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={ariaLabel ?? title ?? 'Modal'}
        className={cn('ua-card rounded-[var(--ua-radius-overlay)] overflow-hidden flex flex-col max-h-[90vh]', className)}
        style={{
          background: 'var(--ua-surface-primary)',
          border: '1px solid var(--ua-border-default)',
          boxShadow: 'var(--ua-shadow-overlay)',
          width: MODAL_WIDTHS[size],
          maxWidth: 'calc(100vw - 32px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div
            className="flex items-start justify-between gap-3 border-b px-4 py-3"
            style={{ borderColor: 'var(--ua-border-default)' }}
          >
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-h2" style={{ color: 'var(--ua-text-primary)' }}>
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-small" style={{ color: 'var(--ua-text-secondary)' }}>
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md hover:bg-[var(--ua-surface-hover)] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--ua-shadow-focus)]"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" style={{ color: 'var(--ua-text-secondary)' }} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3.5">
          {children}
        </div>

        {(footer || actions) && (
          <div
            className="flex items-center justify-end gap-2 border-t px-4 py-3"
            style={{ borderColor: 'var(--ua-border-default)' }}
          >
            {footer ?? (
              <>
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                {actions?.map((action) => (
                  <Button
                    key={action.label}
                    variant={action.variant ?? 'primary'}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {action.label}
                  </Button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export type { ModalProps };
