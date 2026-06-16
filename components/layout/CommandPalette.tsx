'use client';

import { useEffect, useRef } from 'react';
import { COMMAND_PALETTE_FILTERS, getCommandPaletteNavItems } from '@/lib/navigation/appRoutes';
import type { NavItem } from '@/components/layout/commandPaletteReducer';
import {
  AlertCircle,
  Clipboard,
  Download,
  LayoutGrid,
  Settings,
  Star,
  Users,
} from 'lucide-react';
import CommandPaletteSurface from '@/components/layout/CommandPaletteSurface';

const PALETTE_ICONS: Record<string, React.ReactNode> = {
  '/dashboard': <LayoutGrid size={14} aria-hidden="true" />,
  '/customers': <Users size={14} aria-hidden="true" />,
  '/claims': <Clipboard size={14} aria-hidden="true" />,
  '/chargebacks': <Download size={14} aria-hidden="true" />,
  '/watchlist': <Star size={14} aria-hidden="true" />,
  '/settings': <Settings size={14} aria-hidden="true" />,
  filter_high_risk: <Star size={14} aria-hidden="true" />,
  filter_new: <AlertCircle size={14} aria-hidden="true" />,
};

const DEFAULT_PALETTE_ICON = PALETTE_ICONS['/dashboard'];

function buildCommandPaletteNavItems(): NavItem[] {
  const routes = getCommandPaletteNavItems().map((item) => ({
    ...item,
    icon: PALETTE_ICONS[item.href] ?? DEFAULT_PALETTE_ICON,
  }));
  const filters = COMMAND_PALETTE_FILTERS.map((item, index) => ({
    label: item.label,
    description: item.description,
    href: item.href,
    icon: index === 0 ? PALETTE_ICONS.filter_high_risk : PALETTE_ICONS.filter_new,
  }));
  return [...routes, ...filters];
}

const NAV_ITEMS: NavItem[] = buildCommandPaletteNavItems();

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null!);
  const openGenerationRef = useRef(0);
  const prevIsOpenRef = useRef(isOpen);

  if (isOpen && !prevIsOpenRef.current) {
    openGenerationRef.current += 1;
  }
  prevIsOpenRef.current = isOpen;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(focusTimer);
    }
    if (dialog.open) dialog.close();
    return undefined;
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Command palette"
      className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-md border-0 p-0 shadow-2xl overflow-hidden backdrop:bg-black/40"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {isOpen ? (
        <CommandPaletteSurface
          key={openGenerationRef.current}
          navItems={NAV_ITEMS}
          onClose={onClose}
          inputRef={inputRef}
        />
      ) : null}
    </dialog>
  );
}
