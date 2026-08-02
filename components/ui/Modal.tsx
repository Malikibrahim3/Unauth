'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { DURATION, EASE } from '@/lib/design/motion';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import { OverlayPortal } from '@/components/ui/OverlayPortal';

interface ModalAction {
  label: string;
  onClick: () => void;
  /** `commit` is the neutral high-stakes action (§3.2) — financial decisions,
   *  irreversible workflow steps, and confirmation. */
  variant?: 'primary' | 'commit' | 'secondary' | 'danger';
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
  const { mounted, phase, containerRef, motionAllowed } = useOverlayPresence({
    open,
    onClose,
    exitDurationMs: DURATION.fast,
    trapFocus: true,
    lockBodyScroll: true,
  });

  if (!mounted) return null;

  const isOpen = phase === 'open';
  const duration = phase === 'exiting' ? DURATION.fast : DURATION.base;
  const ease = phase === 'exiting' ? EASE.exit : EASE.enter;
  const transition = motionAllowed ? `opacity ${duration}ms ${ease}, transform ${duration}ms ${ease}` : 'none';

  return (
    <OverlayPortal>
    <div
      role="presentation"
      className="fixed inset-0 flex items-center justify-center"
      aria-hidden={phase === 'exiting' ? true : undefined}
      style={{
        background: 'var(--ua-backdrop)',
        zIndex: 'var(--ua-z-modal)' as unknown as number,
        opacity: isOpen ? 1 : 0,
        transition: motionAllowed ? `opacity ${duration}ms ${ease}` : 'none',
        pointerEvents: phase === 'exiting' ? 'none' : undefined,
      }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={ariaLabel ?? title ?? 'Modal'}
        className={cn('ua-card rounded-[var(--ua-radius-overlay)] overflow-hidden flex flex-col max-h-[90vh]', className)}
        style={{
          background: 'var(--ua-surface-overlay)',
          border: '1px solid var(--ua-border-default)',
          boxShadow: 'var(--ua-shadow-overlay)',
          width: MODAL_WIDTHS[size],
          maxWidth: 'calc(100vw - 32px)',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.99)',
          transition,
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
    </OverlayPortal>
  );
}

export type { ModalProps };
