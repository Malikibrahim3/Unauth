"use client";

import { useCallback, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button, type ButtonVariant } from "./Button";
import { OverlayPortal } from "./OverlayPortal";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
import { cn } from "@/lib/utils";
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
  className,
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
  return (
    <OverlayPortal>
      <div
        className="ua-overlay"
        data-phase={phase}
        data-overlay-open={ready ? "true" : "false"}
        aria-hidden={phase === "exiting" ? true : undefined}
        onMouseDown={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) requestClose();
        }}
      >
        <section
          ref={containerRef as React.RefObject<HTMLElement>}
          className={cn("ua-modal", `ua-modal--${size}`, className)}
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
            <header className="ua-modal__header">
              <div>{title ? <h2 id={titleId}>{title}</h2> : null}{description ? <p>{description}</p> : null}</div>
              {showCloseButton ? <button type="button" onClick={requestClose} disabled={pending} aria-label={pending ? "Close unavailable while saving" : "Close dialog"}><X size={17} /></button> : null}
            </header>
          ) : null}
          <div className="ua-modal__body">
            {reviewSummary ? <BeforeYouConfirm {...reviewSummary} /> : null}
            {children}
          </div>
          {pending ? <p className="ua-overlay-pending" role="status" aria-live="polite">{pendingMessage}</p> : null}
          {footer || actions ? (
            <footer className="ua-modal__footer" inert={pending || undefined} aria-disabled={pending || undefined}>
              {footer ?? <><Button variant="secondary" onClick={requestClose} disabled={pending}>Cancel</Button>{actions?.map((action) => <Button key={action.label} variant={action.variant ?? "primary"} onClick={action.onClick} disabled={pending || action.disabled}>{action.label}</Button>)}</>}
            </footer>
          ) : null}
        </section>
      </div>
    </OverlayPortal>
  );
}
