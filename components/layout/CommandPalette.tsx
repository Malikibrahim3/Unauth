"use client";

import { useRef } from "react";
import { DURATION } from "@/lib/design/motion";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
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
  "/overview": <LayoutGrid size={14} aria-hidden="true" />,
  "/customers": <Users size={14} aria-hidden="true" />,
  "/cases": <Clipboard size={14} aria-hidden="true" />,
  "/financials/losses": <LayoutGrid size={14} aria-hidden="true" />,
  "/financials/recovery": <LayoutGrid size={14} aria-hidden="true" />,
  "/financials/reports": <LayoutGrid size={14} aria-hidden="true" />,
  "/sources/connected": <LayoutGrid size={14} aria-hidden="true" />,
  "/controls/rules": <LayoutGrid size={14} aria-hidden="true" />,
  "/controls/flows": <LayoutGrid size={14} aria-hidden="true" />,
  "/settings": <Settings size={14} aria-hidden="true" />,
  "/settings/workspace/account": <Settings size={14} aria-hidden="true" />,
  filter_high_risk: <Star size={14} aria-hidden="true" />,
  filter_new: <AlertCircle size={14} aria-hidden="true" />,
};

const DEFAULT_PALETTE_ICON = PALETTE_ICONS["/overview"];

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
  const inputRef = useRef<HTMLInputElement>(null!);

  const { mounted, phase, containerRef, motionAllowed } = useOverlayPresence({
    open: isOpen,
    onClose,
    exitDurationMs: DURATION.fast,
    trapFocus: true,
    lockBodyScroll: true,
    transient: true,
  });

  if (!mounted) return null;

  const isVisible = phase === "open";

  return (
    <OverlayPortal>
      <div
        role="presentation"
        aria-hidden={phase === "exiting" ? true : undefined}
        className="fixed inset-0 z-50 flex items-start justify-center"
        style={{
          background: "var(--ua-backdrop)",
          opacity: isVisible ? 1 : 0,
          paddingTop: "20vh",
          pointerEvents: phase === "exiting" ? "none" : undefined,
          transition: motionAllowed ? `opacity ${DURATION.fast}ms var(--ua-ease-standard)` : "none",
        }}
        onClick={onClose}
      >
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          tabIndex={-1}
          className="w-full max-w-lg overflow-hidden rounded-[var(--ua-radius-overlay)] border p-0 shadow-[var(--ua-shadow-overlay)]"
          style={{
            background: "var(--ua-surface-overlay)",
            borderColor: "var(--ua-border-default)",
            opacity: isVisible ? 1 : 0,
            transform: `translateY(${isVisible ? 0 : 2}px)`,
            transition: motionAllowed ? `opacity ${DURATION.fast}ms var(--ua-ease-standard), transform ${DURATION.fast}ms var(--ua-ease-standard)` : "none",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <CommandPaletteSurface
            navItems={buildCommandPaletteNavItems(permissions)}
            onClose={onClose}
            inputRef={inputRef}
          />
        </div>
      </div>
    </OverlayPortal>
  );
}
