'use client';

import { useEffect, useRef } from 'react';
import { COMMAND_PALETTE_FILTERS, getCommandPaletteNavItems } from '@/lib/navigation/appRoutes';
import type { NavItem } from '@/components/layout/commandPaletteReducer';
import CommandPaletteSurface from '@/components/layout/CommandPaletteSurface';

const PALETTE_ICONS: Record<string, React.ReactNode> = {
  '/dashboard': (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  '/customers': (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  '/claims': (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 4h10v9H3V4z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 2h6v2H5V2z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  '/upload': (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 11V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 13h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  '/chargebacks': (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="12" width="12" height="2" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  '/watchlist': (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5L9.854 5.41l4.146.603-3 2.922.708 4.125L8 10.896l-3.708 1.164.708-4.125-3-2.922 4.146-.603L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  '/history': (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  '/settings': (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  filter_high_risk: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2L9.5 6h4L10 9l1.5 5L8 12l-3.5 2L6 9 2.5 6h4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  filter_new: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5v3M8 11v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
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
      className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border-0 p-0 shadow-2xl overflow-hidden backdrop:bg-black/40"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
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
