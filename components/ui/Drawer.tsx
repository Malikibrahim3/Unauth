'use client';

import { type ReactNode, useId } from 'react';
import { X } from 'lucide-react';
import { DURATION } from '@/lib/design/motion';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import { OverlayPortal } from '@/components/ui/OverlayPortal';

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
  const generatedId = useId();
  const titleId = `object-preview-title-${generatedId.replaceAll(':', '')}`;

  const { mounted, phase, containerRef, motionAllowed } = useOverlayPresence({
    open,
    onClose,
    exitDurationMs: DURATION.base,
    trapFocus: true,
    lockBodyScroll: true,
  });

  if (!mounted) return null;

  const isOpen = phase === 'open';
  const enterDuration = DURATION.slow;
  const exitDuration = DURATION.base;
  const duration = phase === 'exiting' ? exitDuration : enterDuration;

  return (
    <OverlayPortal>
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={phase === 'exiting' ? true : undefined}
      aria-label={title ? undefined : (ariaLabel ?? 'Panel')}
      aria-labelledby={title ? titleId : undefined}
      className="fixed inset-0 flex justify-end"
      style={{
        zIndex: 'var(--ua-z-drawer)' as unknown as number,
        pointerEvents: phase === 'exiting' ? 'none' : undefined,
      }}
    >
      {closeOnBackdrop ? (
        <button
          type="button"
          aria-label="Close panel"
          className="absolute inset-0 cursor-default border-0 p-0"
          style={{
            background: 'var(--ua-backdrop)',
            opacity: isOpen ? 1 : 0,
            transition: motionAllowed ? `opacity ${duration}ms var(--ua-ease-standard)` : 'none',
          }}
          onClick={onClose}
        />
      ) : null}
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        tabIndex={-1}
        className="relative z-10 flex h-full max-h-full flex-col"
        style={{
          width: typeof width === 'number' ? `min(${width}px, 100vw)` : width,
          background: 'var(--ua-surface-overlay)',
          borderLeft: '1px solid var(--ua-border-subtle)',
          boxShadow: 'var(--ua-shadow-overlay)',
          transform: isOpen ? 'translateX(0)' : 'translateX(24px)',
          transition: motionAllowed ? `transform ${duration}ms var(--ua-ease-standard)` : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className="flex items-center justify-between border-b border-[var(--ua-border-subtle)] shrink-0"
            style={{
              height: 56,
              padding: '0 var(--ua-space-5)',
              background: 'var(--ua-surface-overlay)',
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
            className="shrink-0 bg-[var(--ua-surface-overlay)] border-t border-[var(--ua-border-subtle)]"
            // The footer is outside the scrollable body and is already held
            // at the bottom by the drawer's flex column layout.
            style={{ position: 'relative', zIndex: 'var(--ua-z-header)' as unknown as number }}
          >
            {footer}
          </div>
        )}
      </div>

    </div>
    </OverlayPortal>
  );
}
