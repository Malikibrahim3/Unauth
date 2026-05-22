'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommandPalette from './CommandPalette';
import { AvatarMenu } from './AvatarMenu';

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbSegment[];
  actions?: React.ReactNode;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  merchantName?: string | null;
  environment?: string;
  userEmail?: string | null;
}

export default function AppHeader({ breadcrumbs, actions, onToggleSidebar, sidebarCollapsed, merchantName, environment, userEmail }: AppHeaderProps) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  const segments = breadcrumbs ?? deriveFromPathname(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-base)_92%,transparent)] px-4 backdrop-blur-sm">
      {onToggleSidebar && (
        <button type="button" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="flex h-8 w-8 items-center justify-center rounded-sm text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] focus-ring">
          <span className="flex flex-col gap-1">
            <span className="h-px w-4 bg-current" />
            <span className="h-px w-4 bg-current" />
            <span className="h-px w-4 bg-current" />
          </span>
        </button>
      )}

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-0">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <span key={`${seg.label}-${i}`} className="flex items-center gap-0">
              {i > 0 && <ChevronRight className="mx-1.5 h-3 w-3 text-[var(--ink-tertiary)]" aria-hidden="true" />}
              {isLast || !seg.href ? (
                <span className={cn('truncate', isLast ? 't-label text-[var(--ink-primary)]' : 't-caption text-[var(--ink-tertiary)]')} aria-current={isLast ? 'page' : undefined}>
                  {isLast && <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--copper-bright)] align-middle" aria-hidden="true" />}
                  {seg.label}
                </span>
              ) : (
                <Link href={seg.href} className="truncate t-caption text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)]">
                  {seg.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {actions && <div className="flex items-center gap-2">{actions}</div>}

      <button type="button" aria-label="Search (⌘K)" onClick={() => setPaletteOpen(true)} className="flex h-8 items-center gap-1.5 rounded-sm border border-[var(--surface-border)] bg-[var(--surface-raised)] px-2 t-caption text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] focus-ring">
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline font-mono text-[10px]">⌘K</kbd>
      </button>
      <AvatarMenu email={userEmail} />
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}

function deriveFromPathname(pathname: string): BreadcrumbSegment[] {
  const segmentMap: Record<string, string> = {
    dashboard: 'Home',
    upload: 'New Audit',
    audits: 'Audits',
    customers: 'Customers',
    watchlist: 'Watchlist',
    history: 'Audit history',
    inbox: 'Inbox',
    onboarding: 'Onboarding',
    help: 'Help',
    settings: 'Settings',
    audit: 'Audit results',
    login: 'Sign in',
  };
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Home' }];
  return parts.map((part, i) => ({ label: segmentMap[part] ?? part, href: i < parts.length - 1 ? `/${parts.slice(0, i + 1).join('/')}` : undefined }));
}
