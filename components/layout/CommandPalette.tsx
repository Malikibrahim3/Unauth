'use client';
import { useRef } from 'react';
import { APP_ROUTES, COMMAND_PALETTE_FILTERS, getCommandPaletteNavItems } from '@/lib/navigation/appRoutes';
import type { Permission } from '@/lib/permissions';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import CommandPaletteSurface from './CommandPaletteSurface';

function PaletteGlyph({ variant = 'grid' }: { variant?: 'grid' | 'filter' }) {
  return variant === 'filter'
    ? <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><path d="M2 3h10M3.6 7h6.8M5.2 11h3.6"/></svg>
    : <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><rect x="2" y="2" width="4" height="4" rx="1"/><rect x="8" y="2" width="4" height="4" rx="1"/><rect x="2" y="8" width="4" height="4" rx="1"/><rect x="8" y="8" width="4" height="4" rx="1"/></svg>;
}
function items(permissions: Permission[]) {
  const set = new Set(permissions);
  const routes = getCommandPaletteNavItems(set).map((item) => ({
    ...item,
    icon: <PaletteGlyph />,
  }));
  const canViewCases = !APP_ROUTES.claims.permission || set.has(APP_ROUTES.claims.permission);
  const shortcuts = canViewCases
    ? COMMAND_PALETTE_FILTERS.map((item) => ({
        ...item,
        group: 'Case shortcuts',
        icon: <PaletteGlyph variant="filter" />,
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
        data-phase={phase}
        data-overlay-open={ready ? 'true' : 'false'}
        aria-hidden={phase === 'exiting' ? true : undefined}
        style={{ position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'auto', background: 'rgba(32,28,23,.38)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 96 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          ref={containerRef as React.RefObject<HTMLElement>}
          role="dialog"
          aria-modal="true"
          aria-label="Search and navigate"
          tabIndex={-1}
          data-overlay-id="global-command-palette"
          data-overlay-state={ready ? 'open' : phase}
          style={{ width: 660, maxHeight: 'calc(100dvh - 120px)', background: '#ffffff', borderRadius: 14, boxShadow: '0 32px 70px rgba(28,24,18,.34),0 2px 8px rgba(28,24,18,.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#1c1f23' }}
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
