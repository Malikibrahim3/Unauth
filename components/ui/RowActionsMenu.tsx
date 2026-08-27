"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { DURATION } from "@/lib/design/motion";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
import { OverlayPortal } from "@/components/ui/OverlayPortal";

export interface RowAction {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

/**
 * Accessible row-action menu (WS4.2, §7.3). A single quiet `⋯` trigger replaces
 * the per-row button stacks; opens a keyboard-navigable menu (Escape closes,
 * arrows move, Enter selects, click-outside dismisses) on the shared overlay
 * presence primitive. The trigger stays in the DOM for keyboard users but is
 * visually quiet until the row is hovered/focused (parent controls that via
 * `group`/`focus-within`).
 */
export function RowActionsMenu({
  actions,
  label = "Row actions",
  disabled = false,
}: {
  actions: RowAction[];
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0, top: 0 });
  const { mounted, phase, containerRef, motionAllowed } = useOverlayPresence({
    open,
    onClose: () => setOpen(false),
    exitDurationMs: DURATION.fast,
    closeOnOutsideClick: false,
    restoreFocus: true,
    transient: true,
  });

  useEffect(() => {
    if (!open) return;
    containerRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus();
  }, [open, containerRef]);

  useEffect(() => {
    if (!mounted) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 168;
      const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
      const openUpward = rect.bottom + 240 > window.innerHeight;
      setPosition(openUpward
        ? { left, bottom: window.innerHeight - rect.top + 4 }
        : { left, top: rect.bottom + 4 });
    };
    const closeWhenOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    update();
    document.addEventListener('mousedown', closeWhenOutside);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      document.removeEventListener('mousedown', closeWhenOutside);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [mounted, containerRef]);

  if (actions.length === 0) return null;

  function moveFocus(delta: number, current: number) {
    const items = containerRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])',
    );
    if (!items || items.length === 0) return;
    const next = (current + delta + items.length) % items.length;
    items[next]?.focus();
  }

  const isOpen = phase === "open";

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--uo-route-radius-control)] text-[var(--uo-route-text-secondary)] hover:bg-[var(--uo-route-surface-hover)] hover:text-[var(--uo-route-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--uo-route-border-focus)] disabled:cursor-not-allowed disabled:bg-[var(--uo-route-surface-muted)] disabled:text-[var(--uo-route-text-disabled)]"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {mounted ? (
        <OverlayPortal>
        <div
          ref={containerRef as RefObject<HTMLDivElement>}
          role="menu"
          aria-label={label}
          aria-hidden={phase === "exiting" ? true : undefined}
          className="fixed z-[var(--uo-route-z-dropdown)] min-w-[168px] overflow-hidden rounded-[var(--uo-route-radius-control)] border bg-[var(--uo-route-surface-overlay)] py-1 shadow-[var(--uo-route-shadow-menu)]"
          style={{
            left: position.left,
            top: position.top,
            bottom: position.bottom,
            borderColor: "var(--uo-route-border-default)",
            opacity: isOpen ? 1 : 0,
            transform: `translateY(${isOpen ? 0 : 2}px)`,
            transition: motionAllowed ? `opacity ${DURATION.fast}ms var(--uo-route-ease-standard), transform ${DURATION.fast}ms var(--uo-route-ease-standard)` : "none",
            pointerEvents: phase === "exiting" ? "none" : undefined,
          }}
        >
          {actions.map((action, index) => (
            <button
              key={action.label}
              role="menuitem"
              type="button"
              disabled={action.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                action.onSelect();
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveFocus(1, index);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  moveFocus(-1, index);
                }
              }}
              className="flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-[var(--uo-route-surface-hover)] focus-visible:bg-[var(--uo-route-surface-hover)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[var(--uo-route-surface-muted)] disabled:text-[var(--uo-route-text-disabled)]"
              style={{
                color: action.disabled
                  ? "var(--uo-route-text-disabled)"
                  : action.tone === "danger"
                    ? "var(--uo-route-risk-critical)"
                    : "var(--uo-route-text-primary)",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
        </OverlayPortal>
      ) : null}
    </div>
  );
}
