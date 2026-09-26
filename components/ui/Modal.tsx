"use client";

import { useCallback, useId, type CSSProperties, type ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";
import { OverlayPortal } from "./OverlayPortal";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
import { BeforeYouConfirm, type BeforeYouConfirmProps } from "./BeforeYouConfirm";

interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: Extract<ButtonVariant, "primary" | "commit" | "secondary" | "danger">;
  disabled?: boolean;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  actions?: ModalAction[];
  size?: "sm" | "md" | "lg";
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  "aria-label"?: string;
  className?: string;
  panelClassName?: string;
  overlayClassName?: string;
  style?: CSSProperties;
  overlayStyle?: CSSProperties;
  overlayId?: string;
  /** Prevents Escape, backdrop, close, cancel, and action dismissal while a save is in flight. */
  pending?: boolean;
  pendingMessage?: string;
  /** Canonical object/effect/reversibility/audit summary for consequential actions. */
  reviewSummary?: BeforeYouConfirmProps;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  actions,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  "aria-label": ariaLabel,
  className: _className,
  panelClassName,
  overlayClassName,
  style,
  overlayStyle,
  overlayId,
  pending = false,
  pendingMessage = "Saving this change. Keep this dialog open.",
  reviewSummary,
}: ModalProps) {
  const titleId = useId();
  const requestClose = useCallback(() => {
    if (!pending) onClose();
  }, [onClose, pending]);
  const { mounted, phase, containerRef } = useOverlayPresence({
    open,
    onClose: requestClose,
    trapFocus: true,
    restoreFocus: true,
    lockBodyScroll: true,
    closeOnEscape: closeOnEscape && !pending,
  });
  if (!mounted) return null;
  const ready = phase === "open";
  const maxWidth = size === "sm" ? 448 : size === "lg" ? 896 : 672;
  return (
    <OverlayPortal>
      <div
        className={overlayClassName}
        style={{ pointerEvents: 'auto', position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,.25)', ...overlayStyle }}
        data-phase={phase}
        data-overlay-open={ready ? "true" : "false"}
        aria-hidden={phase === "exiting" ? true : undefined}
        onMouseDown={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) requestClose();
        }}
      >
        <section
          className={panelClassName}
          ref={containerRef as React.RefObject<HTMLElement>}
          style={{ display: 'flex', width: '100%', maxWidth, maxHeight: 'calc(100dvh - 2rem)', flexDirection: 'column', overflow: 'hidden', border: '1px solid #d8d4cf', borderRadius: 12, background: '#fff', color: '#1c1f23', boxShadow: '0 24px 60px rgba(28,27,25,.22)', ...style }}
          role="dialog"
          aria-modal="true"
          aria-label={title ? undefined : ariaLabel ?? "Dialog"}
          aria-labelledby={title ? titleId : undefined}
          data-overlay-id={overlayId}
          data-overlay-state={ready ? "open" : phase}
          data-pending={pending ? "true" : undefined}
          aria-busy={pending || undefined}
          tabIndex={-1}
        >
          {(title || description) ? (
            <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid #e4e3e0', padding: '16px 20px' }}>
              <div>{title ? <h2 id={titleId} style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{title}</h2> : null}{description ? <p style={{ margin: '4px 0 0', color: '#64686d', fontSize: 12, lineHeight: '20px' }}>{description}</p> : null}</div>
              {showCloseButton ? <button style={{ display: 'grid', width: 32, height: 32, flexShrink: 0, placeItems: 'center', border: '1px solid #e4e3e0', borderRadius: 8, background: '#fff', color: '#64686d' }} type="button" onClick={requestClose} disabled={pending} aria-label={pending ? "Close unavailable while saving" : "Close dialog"}><svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 4l9 9M13 4l-9 9" /></svg></button> : null}
            </header>
          ) : null}
          <div style={{ minHeight: 0, flex: 1, overflowY: 'auto', padding: 20 }}>
            {reviewSummary ? <BeforeYouConfirm {...reviewSummary} /> : null}
            {children}
          </div>
          {pending ? <p style={{ margin: 0, borderTop: '1px solid #e4e3e0', background: '#fff3e9', padding: '12px 20px', color: '#7a5310', fontSize: 11 }} role="status" aria-live="polite">{pendingMessage}</p> : null}
          {footer || actions ? (
            <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #e4e3e0', background: '#ffffff', padding: '16px 20px' }} inert={pending || undefined} aria-disabled={pending || undefined}>
              {footer ?? <><Button variant="secondary" onClick={requestClose} disabled={pending}>Cancel</Button>{actions?.map((action) => <Button key={action.label} variant={action.variant ?? "primary"} onClick={action.onClick} disabled={pending || action.disabled}>{action.label}</Button>)}</>}
            </footer>
          ) : null}
        </section>
      </div>
    </OverlayPortal>
  );
}
