"use client";

import { useEffect, useRef } from "react";
import { DURATION } from "@/lib/design/motion";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
import {
  APP_ROUTES,
  COMMAND_PALETTE_FILTERS,
  getCommandPaletteNavItems,
} from "@/lib/navigation/appRoutes";
import type { Permission } from "@/lib/permissions";
import type { NavItem } from "@/components/layout/commandPaletteReducer";
import {
  AlertCircle,
  Clipboard,
  LayoutGrid,
  Settings,
  Star,
  Users,
} from "lucide-react";
import CommandPaletteSurface from "@/components/layout/CommandPaletteSurface";

const PALETTE_ICONS: Record<string, React.ReactNode> = {
  "/dashboard": <LayoutGrid size={14} aria-hidden="true" />,
  "/customers": <Users size={14} aria-hidden="true" />,
  "/claims": <Clipboard size={14} aria-hidden="true" />,
  "/settings": <Settings size={14} aria-hidden="true" />,
  filter_high_risk: <Star size={14} aria-hidden="true" />,
  filter_new: <AlertCircle size={14} aria-hidden="true" />,
};

const DEFAULT_PALETTE_ICON = PALETTE_ICONS["/dashboard"];

function buildCommandPaletteNavItems(permissions: Permission[]): NavItem[] {
  const permissionSet = new Set(permissions);
  const routes = getCommandPaletteNavItems(permissionSet).map((item) => ({
    ...item,
    icon: PALETTE_ICONS[item.href] ?? DEFAULT_PALETTE_ICON,
  }));
  const canViewCases =
    !APP_ROUTES.claims.permission ||
    permissionSet.has(APP_ROUTES.claims.permission);
  const filters = (canViewCases ? COMMAND_PALETTE_FILTERS : []).map(
    (item, index) => ({
      label: item.label,
      description: item.description,
      href: item.href,
      icon:
        index === 0 ? PALETTE_ICONS.filter_high_risk : PALETTE_ICONS.filter_new,
    }),
  );
  return [...routes, ...filters];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  permissions?: Permission[];
}

export default function CommandPalette({
  isOpen,
  onClose,
  permissions = [],
}: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null!);

  // The native <dialog> already gives this focus trap, Escape, and a backdrop
  // for free — the shared presence primitive is used only for its §7.3
  // enter/exit timing (a fast fade + 2px settle), so the dialog element stays
  // genuinely open through the exit transition instead of vanishing instantly.
  const { mounted, phase, motionAllowed } = useOverlayPresence({
    open: isOpen,
    exitDurationMs: DURATION.fast,
    transient: true,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(focusTimer);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!mounted && dialog?.open) dialog.close();
  }, [mounted]);

  const isVisible = phase === 'open';

  return (
    <dialog
      ref={dialogRef}
      aria-label="Command palette"
      className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg overflow-hidden rounded-[var(--ua-radius-overlay)] border-0 p-0 shadow-[var(--ua-shadow-overlay)] backdrop:bg-[var(--ua-backdrop)]"
      style={{
        background: "var(--ua-surface-primary)",
        border: "1px solid var(--ua-border-default)",
        opacity: isVisible ? 1 : 0,
        transform: `translate(-50%, ${isVisible ? 0 : 2}px)`,
        transition: motionAllowed ? `opacity ${DURATION.fast}ms var(--ua-ease-standard), transform ${DURATION.fast}ms var(--ua-ease-standard)` : 'none',
      }}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {mounted ? (
        <CommandPaletteSurface
          navItems={buildCommandPaletteNavItems(permissions)}
          onClose={onClose}
          inputRef={inputRef}
        />
      ) : null}
    </dialog>
  );
}
