'use client';

import { type ReactNode, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  'aria-label'?: string;
}

export function Drawer({
  open,
  onClose,
  width = 560,
  title,
  footer,
  children,
  closeOnBackdrop = true,
  'aria-label': ariaLabel,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const el = drawerRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    first?.focus();
    return () => document.removeEventListener('keydown', trap);
  }, [open]);

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) onClose();
  }, [closeOnBackdrop, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title ?? 'Panel'}
      style={{ zIndex: 'var(--z-drawer)' as unknown as number }}
      className="fixed inset-0 flex"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(14,17,22,0.4)]"
        style={{
          animation: `fadeIn var(--duration-fast) var(--ease-standard) both`,
        }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 bottom-0 flex flex-col bg-[var(--bg-surface)]"
        style={{
          width: typeof width === 'number' ? `min(${width}px, 100vw)` : width,
          boxShadow: 'var(--shadow-drawer)',
          animation: `slideInRight var(--duration-default) var(--ease-emphasized) both`,
        }}
      >
        {/* Sticky header (only when title is provided) */}
        {title && (
          <div
            className="flex items-center justify-between px-[var(--space-5)] py-[var(--space-4)] border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0"
            style={{ position: 'sticky', top: 0, zIndex: 'var(--z-sticky)' as unknown as number }}
          >
            <h2 className="text-h2 text-[var(--text-primary)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-[var(--radius-2)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Sticky footer */}
        {footer && (
          <div
            className="shrink-0 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]"
            style={{ position: 'sticky', bottom: 0 }}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
