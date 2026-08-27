'use client';
import { useRef } from 'react';
import { LayoutGrid } from 'lucide-react';
import { APP_ROUTES, COMMAND_PALETTE_FILTERS, getCommandPaletteNavItems } from '@/lib/navigation/appRoutes';
import type { Permission } from '@/lib/permissions';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import CommandPaletteSurface from './CommandPaletteSurface';
function items(permissions: Permission[]) {
  const set = new Set(permissions);
  const routes = getCommandPaletteNavItems(set).map((item) => ({
    ...item,
    icon: <LayoutGrid size={15} aria-hidden="true" />,
  }));
  const canViewCases = !APP_ROUTES.claims.permission || set.has(APP_ROUTES.claims.permission);
  const shortcuts = canViewCases
    ? COMMAND_PALETTE_FILTERS.map((item) => ({
        ...item,
        group: 'Case shortcuts',
        icon: <LayoutGrid size={15} aria-hidden="true" />,
      }))
    : [];
  return [...routes, ...shortcuts];
}

export default function CommandPalette({
  isOpen,
  onClose,
  permissions = [],
  workspaceName,
}: {
  isOpen: boolean;
  onClose: () => void;
  permissions?: Permission[];
  workspaceName?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null!);
  const { mounted, phase, containerRef } = useOverlayPresence({
    open: isOpen,
    onClose,
    trapFocus: true,
    restoreFocus: true,
    lockBodyScroll: true,
    transient: true,
  });
  if (!mounted) return null;
  const ready = phase === 'open';
  return (
    <OverlayPortal>
      <div
        className="ua-command-layer"
        data-phase={phase}
        data-overlay-open={ready ? 'true' : 'false'}
        aria-hidden={phase === 'exiting' ? true : undefined}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          ref={containerRef as React.RefObject<HTMLElement>}
          className="ua-command-palette"
          role="dialog"
          aria-modal="true"
          aria-label="Search and navigate"
          tabIndex={-1}
          data-overlay-id="global-command-palette"
          data-overlay-state={ready ? 'open' : phase}
        >
          <CommandPaletteSurface
            navItems={items(permissions)}
            onClose={onClose}
            inputRef={inputRef}
            workspaceName={workspaceName}
          />
        </section>
      </div>
    </OverlayPortal>
  );
}
