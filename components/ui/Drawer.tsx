'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';
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
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const generatedId = useId();
  const titleId = `object-preview-title-${generatedId.replaceAll(':', '')}`;

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const el = drawerRef.current;
    if (!el) return;
    const getFocusable = () => el.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) { e.preventDefault(); el.focus(); return; }
      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === el) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    const initialTarget = getFocusable()[0] ?? el;
    initialTarget.focus();
    return () => {
      document.removeEventListener('keydown', trap);
      returnFocusRef.current?.focus({ preventScroll: true });
    };
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
      aria-label={title ? undefined : (ariaLabel ?? 'Panel')}
      aria-labelledby={title ? titleId : undefined}
      className="fixed inset-0 flex justify-end"
      style={{ zIndex: 'var(--ua-z-drawer)' as unknown as number }}
    >
      {closeOnBackdrop ? (
        <button
          type="button"
          aria-label="Close panel"
          className="absolute inset-0 cursor-default border-0 p-0 backdrop-blur-[3px]"
          style={{ background: 'var(--ua-backdrop)' }}
          onClick={onClose}
        />
      ) : null}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="relative z-10 flex h-full max-h-full flex-col"
        style={{
          width: typeof width === 'number' ? `min(${width}px, 100vw)` : width,
          background: 'var(--ua-surface-primary)',
          borderLeft: '1px solid var(--ua-border-subtle)',
          boxShadow: 'var(--ua-shadow-overlay)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className="flex items-center justify-between border-b border-[var(--ua-border-subtle)] shrink-0"
            style={{
              height: 56,
              padding: '0 var(--ua-space-5)',
              background: 'var(--ua-surface-primary)',
              // The body below is the only scroll container, so the header
              // stays fixed in the flex layout without Safari's sticky
              // positioning bug moving it into the middle of the drawer.
              position: 'relative',
              zIndex: 'var(--ua-z-header)' as unknown as number,
            }}
          >
            <h2 id={titleId} className="text-h3" style={{ color: 'var(--ua-text-primary)' }}>{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-[var(--ua-radius-control)] text-[var(--ua-text-tertiary)] hover:text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--ua-shadow-focus)]"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div
            className="shrink-0 bg-[var(--ua-surface-primary)] border-t border-[var(--ua-border-subtle)]"
            // The footer is outside the scrollable body and is already held
            // at the bottom by the drawer's flex column layout.
            style={{ position: 'relative', zIndex: 'var(--ua-z-header)' as unknown as number }}
          >
            {footer}
          </div>
        )}
      </div>

    </div>
  );
}
