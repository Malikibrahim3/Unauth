'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommandPalette from './CommandPalette';
import { MerchantEnvChip } from './MerchantEnvChip';
import { AvatarMenu } from './AvatarMenu';

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbSegment[];
  /** Right-side slot: time range picker, extra actions, etc. */
  actions?: React.ReactNode;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  /** Merchant name shown in the env chip left of search */
  merchantName?: string | null;
  /** Deployment environment, e.g. 'production' | 'sandbox' */
  environment?: string;
  /** Authenticated user email for the avatar menu */
  userEmail?: string | null;
}

/**
 * AppHeader — 56px sticky header per §3.3.
 * Renders breadcrumbs in the center-left region; ⌘K trigger and avatar slot on the right.
 */
export default function AppHeader({
  breadcrumbs,
  actions,
  onToggleSidebar,
  sidebarCollapsed,
  merchantName,
  environment,
  userEmail,
}: AppHeaderProps) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
  // Derive a simple breadcrumb from pathname when none is provided
  const segments: BreadcrumbSegment[] = breadcrumbs ?? deriveFromPathname(pathname);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center gap-3',
        'border-b px-4',
        'bg-[var(--bg-surface)]',
        'border-[var(--border-subtle)]',
      )}
      style={{ borderBottomColor: 'var(--border-subtle)' }}
    >
      {/* Sidebar collapse toggle */}
      {onToggleSidebar && (
        <button
          type="button"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleSidebar}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md',
            'text-[var(--text-subtle)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
            'flex-shrink-0',
          )}
        >
          {/* Hamburger / bars icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="4"  width="12" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
        </button>
      )}

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-0">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <span key={i} className="flex items-center gap-0">
              {i > 0 && (
                <ChevronRight
                  className="mx-1.5 h-3 w-3 flex-shrink-0 text-[var(--text-subtle)]"
                  aria-hidden="true"
                />
              )}
              {isLast || !seg.href ? (
                <span
                  className={cn(
                    'text-caption truncate',
                    isLast
                      ? 'font-medium text-[var(--text)]'
                      : 'text-[var(--text-muted)]',
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {seg.label}
                </span>
              ) : (
                <Link
                  href={seg.href}
                  className={cn(
                    'text-caption truncate text-[var(--text-muted)]',
                    'hover:text-[var(--text)] transition-colors duration-[var(--duration-fast)]',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2 rounded-sm',
                  )}
                >
                  {seg.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Right-side actions slot */}
      {actions && (
        <div className="flex flex-shrink-0 items-center gap-2">
          {actions}
        </div>
      )}

      {/* MerchantEnvChip — left of search */}
      <MerchantEnvChip merchantName={merchantName ?? null} environment={environment} />

      {/* ⌘K trigger */}
      <button
        type="button"
        aria-label="Search (⌘K)"
        onClick={openPalette}
        className={cn(
          'flex h-7 items-center gap-1.5 rounded-md px-2',
          'border border-[var(--border)] bg-[var(--bg-inset)]',
          'text-caption text-[var(--text-subtle)]',
          'hover:border-[var(--border-strong)] hover:text-[var(--text)]',
          'transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
          'flex-shrink-0',
        )}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 8L10.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline font-mono text-[10px] opacity-60">⌘K</kbd>
      </button>

      {/* AvatarMenu — right of search */}
      <AvatarMenu email={userEmail} />

      <CommandPalette isOpen={paletteOpen} onClose={closePalette} />
    </header>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveFromPathname(pathname: string): BreadcrumbSegment[] {
  const segmentMap: Record<string, string> = {
    dashboard:   'Home',
    upload:      'New Audit',
    audits:      'Audits',
    customers:   'Customers',
    lookup:      'Lookup',
    watchlist:   'Watchlist',
    history:     'Audit history',
    inbox:       'Inbox',
    home:        'Home',
    onboarding:  'Onboarding',
    help:        'Help',
    settings:    'Settings',
    saved:       'Saved Views',
    audit:       'Audit results',
    new:         'New Audit',
  };

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Home' }];

  return parts.map((part, i) => {
    const label = segmentMap[part] ?? humanize(part);
    const href = '/' + parts.slice(0, i + 1).join('/');
    return { label, href };
  });
}

function humanize(s: string): string {
  if (s.length > 16) return s.slice(0, 8) + '…';
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
