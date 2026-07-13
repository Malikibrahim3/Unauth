"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface RowAction {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

/**
 * Accessible row-action menu (WS4.2). A single quiet `⋯` trigger replaces the
 * per-row button stacks; opens a keyboard-navigable menu (Escape closes, arrows
 * move, Enter selects, click-outside dismisses). The trigger stays in the DOM
 * for keyboard users but is visually quiet until the row is hovered/focused
 * (parent controls that via `group`/`focus-within`).
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    function onDocMouseDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (actions.length === 0) return null;

  function moveFocus(delta: number, current: number) {
    const items = containerRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])',
    );
    if (!items || items.length === 0) return;
    const next = (current + delta + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-40"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-9 z-[var(--z-dropdown)] min-w-[168px] overflow-hidden rounded-lg border bg-[var(--surface)] py-1 shadow-[var(--shadow-md)]"
          style={{ borderColor: "var(--border)" }}
        >
          {actions.map((action, index) => (
            <button
              key={action.label}
              ref={index === 0 ? firstItemRef : undefined}
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
              className="flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none disabled:opacity-40"
              style={{ color: action.tone === "danger" ? "var(--risk-critical-fg)" : "var(--text-primary)" }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
