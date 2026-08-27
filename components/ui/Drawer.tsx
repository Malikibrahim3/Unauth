"use client";

import { useCallback, useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { OverlayPortal } from "./OverlayPortal";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
import { BeforeYouConfirm, type BeforeYouConfirmProps } from "./BeforeYouConfirm";

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  lockBodyScroll?: boolean;
  modal?: boolean;
  "aria-label"?: string;
  overlayId?: string;
  /** Marks a drawer that carries a selected record across registry and detail. */
  signalRail?: boolean;
  /** Prevent dismissal while an in-drawer save or external request is pending. */
  pending?: boolean;
  pendingMessage?: string;
  reviewSummary?: BeforeYouConfirmProps;
};

export function Drawer({ open, onClose, width = 440, title, footer, children, closeOnBackdrop = true, closeOnEscape = true, trapFocus = true, restoreFocus = trapFocus, lockBodyScroll = true, modal = true, "aria-label": ariaLabel, overlayId, signalRail = false, pending = false, pendingMessage = "Saving this change. Keep this panel open.", reviewSummary }: DrawerProps) {
  const titleId = useId();
  const requestClose = useCallback(() => {
    if (!pending) onClose();
  }, [onClose, pending]);
  const { mounted, phase, containerRef } = useOverlayPresence({ open, onClose: requestClose, closeOnEscape: closeOnEscape && !pending, trapFocus, restoreFocus, lockBodyScroll });

  // No-page-shift open: compensate for the scrollbar the body-scroll lock
  // removes, so the page behind the drawer never reflows horizontally.
  useEffect(() => {
    if (!lockBodyScroll || !mounted) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth <= 0) return;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [lockBodyScroll, mounted]);

  if (!mounted) return null;
  const ready = phase === "open";
  return (
    <OverlayPortal>
      <div className="ua-drawer-layer" data-phase={phase} data-overlay-open={ready ? "true" : "false"} data-overlay-id={overlayId} aria-hidden={phase === "exiting" ? true : undefined}>
        {/* The scrim is always present — only whether it closes the drawer on click is conditional. */}
        {closeOnBackdrop ? (
          <button type="button" className="ua-drawer-layer__backdrop" aria-label={pending ? "Close unavailable while saving" : "Close panel"} disabled={pending} onClick={requestClose} />
        ) : (
          <div className="ua-drawer-layer__backdrop" aria-hidden="true" />
        )}
        <aside
          ref={containerRef as React.RefObject<HTMLElement>}
          role="dialog"
          aria-modal={modal ? "true" : undefined}
          aria-label={title ? undefined : ariaLabel ?? "Panel"}
          aria-labelledby={title ? titleId : undefined}
          className="ua-drawer"
          style={{ width: typeof width === "number" ? `min(${width}px, 100vw)` : width }}
          tabIndex={-1}
          data-overlay-id={overlayId}
          data-overlay-state={ready ? "open" : phase}
          data-signal-rail={signalRail ? "true" : undefined}
          data-pending={pending ? "true" : undefined}
          aria-busy={pending || undefined}
        >
          <header className="ua-drawer__header">
            {title ? <h2 id={titleId}>{title}</h2> : <span />}
            <button type="button" aria-label={pending ? "Close unavailable while saving" : "Close panel"} disabled={pending} onClick={requestClose}><X size={17} /></button>
          </header>
          <div className="ua-drawer__body">
            {reviewSummary ? <BeforeYouConfirm {...reviewSummary} /> : null}
            {children}
          </div>
          {pending ? <p className="ua-overlay-pending" role="status" aria-live="polite">{pendingMessage}</p> : null}
          {footer ? <footer className="ua-drawer__footer" inert={pending || undefined} aria-disabled={pending || undefined}>{footer}</footer> : null}
        </aside>
      </div>
    </OverlayPortal>
  );
}
