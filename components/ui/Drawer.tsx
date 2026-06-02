'use client';

import { type ReactNode, useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title ?? 'Panel'}
      className="fixed inset-0 flex justify-end"
      style={{ zIndex: 'var(--z-drawer)' as unknown as number }}
    >
      {closeOnBackdrop ? (
        <button
          type="button"
          aria-label="Close panel"
          className="absolute inset-0 cursor-default border-0 bg-[rgba(20,24,33,0.45)] p-0"
          onClick={onClose}
        />
      ) : null}
      <div
        ref={drawerRef}
        className="relative z-10 flex h-full max-h-full flex-col bg-[var(--bg-surface)]"
        style={{
          width: typeof width === 'number' ? `min(${width}px, 100vw)` : width,
          boxShadow: 'var(--shadow-drawer)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className="flex items-center justify-between px-[var(--space-5)] py-[var(--space-4)] border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0"
            style={{ position: 'sticky', top: 0, zIndex: 'var(--z-sticky)' as unknown as number }}
          >
            <h2 className="text-h2 text-[var(--text-primary)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[var(--radius-2)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div
            className="shrink-0 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]"
            style={{ position: 'sticky', bottom: 0 }}
          >
            {footer}
          </div>
        )}
      </div>

    </div>
  );
}
