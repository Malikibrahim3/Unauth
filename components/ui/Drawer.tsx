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
      <div className="fixed inset-0 z-50" data-phase={phase} data-overlay-open={ready ? "true" : "false"} data-overlay-id={overlayId} aria-hidden={phase === "exiting" ? true : undefined}>
        {/* The scrim is always present — only whether it closes the drawer on click is conditional. */}
        {closeOnBackdrop ? (
          <button type="button" className="fixed inset-0 bg-black/25" aria-label={pending ? "Close unavailable while saving" : "Close panel"} disabled={pending} onClick={requestClose} />
        ) : (
          <div className="fixed inset-0 bg-black/25" aria-hidden="true" />
        )}
        <aside
          ref={containerRef as React.RefObject<HTMLElement>}
          role="dialog"
          aria-modal={modal ? "true" : undefined}
          aria-label={title ? undefined : ariaLabel ?? "Panel"}
          aria-labelledby={title ? titleId : undefined}
          className="pointer-events-auto fixed inset-y-0 right-0 z-10 flex max-w-full flex-col border-l border-[#d8d4cf] bg-white text-[#1c1f23] shadow-2xl"
          style={{ width: typeof width === "number" ? `min(${width}px, 100vw)` : width }}
          tabIndex={-1}
          data-overlay-id={overlayId}
          data-overlay-state={ready ? "open" : phase}
          data-signal-rail={signalRail ? "true" : undefined}
          data-pending={pending ? "true" : undefined}
          aria-busy={pending || undefined}
        >
          <header className="flex items-center justify-between gap-3 border-b border-[#e4e3e0] px-5 py-4">
            {title ? <h2 id={titleId} className="m-0 text-[15px] font-semibold">{title}</h2> : <span />}
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e4e3e0] bg-white text-[#64686d]" type="button" aria-label={pending ? "Close unavailable while saving" : "Close panel"} disabled={pending} onClick={requestClose}><X size={17} /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {reviewSummary ? <BeforeYouConfirm {...reviewSummary} /> : null}
            {children}
          </div>
          {pending ? <p className="m-0 border-t border-[#e4e3e0] bg-[#fff3e9] px-5 py-3 text-[11px] text-[#7a5310]" role="status" aria-live="polite">{pendingMessage}</p> : null}
          {footer ? <footer className="flex items-center justify-end gap-2 border-t border-[#e4e3e0] bg-[#ffffff] px-5 py-4" inert={pending || undefined} aria-disabled={pending || undefined}>{footer}</footer> : null}
        </aside>
      </div>
    </OverlayPortal>
  );
}
