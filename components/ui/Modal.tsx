'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
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
  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: 'color-mix(in srgb, var(--text-primary) 44%, transparent)',
        backdropFilter: 'blur(4px)',
        zIndex: 'var(--z-modal)' as unknown as number,
      }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title ?? 'Modal'}
        className={cn('rounded-[var(--radius-md)] overflow-hidden flex flex-col max-h-[90vh]', className)}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
          width: MODAL_WIDTHS[size],
          maxWidth: 'calc(100vw - 32px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div
            className="flex items-start justify-between gap-4 border-b px-5 py-4"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-h2" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-small" style={{ color: 'var(--text-secondary)' }}>
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-[var(--surface-hover)] transition-colors flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {(footer || actions) && (
          <div
            className="border-t px-5 py-4 flex items-center justify-end gap-2"
            style={{ borderColor: 'var(--border)' }}
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
