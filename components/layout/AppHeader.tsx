'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Bell, ChevronRight, CircleHelp, Menu, Search, Settings2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommandPalette from './CommandPalette';
import { useBreadcrumbOverride } from './BreadcrumbOverrideContext';
import { AvatarMenu } from './AvatarMenu';
import { ContextCreditsBadge } from './ContextCreditsBadge';
import type { Permission } from '@/lib/permissions';
import { useFetchJson } from '@/lib/react/useFetchJson';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import DataHealthDrawer from './DataHealthDrawer';

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
  /** Fictional/operator display name when the auth profile provides one. */
  userName?: string | null;
  /** Authenticated user email for the avatar menu */
  userEmail?: string | null;
  unreadCount?: number;
  permissions?: Permission[];
  connectionState?: ConnectionState | null;
}

/**
 * AppHeader - 52px sticky desktop utility toolbar.
 * Renders parent context in the center-left region; the page header owns the
 * current title so it is never announced twice in the initial viewport.
 */
export default function AppHeader({
  breadcrumbs,
  actions,
  onToggleSidebar,
  sidebarCollapsed,
  userName,
  userEmail,
  unreadCount = 0,
  permissions = [],
  connectionState = null,
}: AppHeaderProps) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = useState<number | null>(null);
  const { data: notificationSummary } = useFetchJson<{ unreadCount?: number }>(
    '/api/notifications/unread-count',
  );
  const resolvedUnreadCount = liveUnreadCount ?? notificationSummary?.unreadCount ?? unreadCount;

  useEffect(() => {
    const handleUnreadChange = (event: Event) => {
      const count = (event as CustomEvent<{ unreadCount?: unknown }>).detail?.unreadCount;
      if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
        setLiveUnreadCount(count);
      }
    };
    window.addEventListener('unauth:notification-unread-change', handleUnreadChange);
    return () => window.removeEventListener('unauth:notification-unread-change', handleUnreadChange);
  }, []);

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
  const overrideLabel = useBreadcrumbOverride();
  const derived: BreadcrumbSegment[] = breadcrumbs ?? deriveFromPathname(pathname);
  // Pages can override the current-page label (e.g. a case reference instead of a UUID).
  const segments: BreadcrumbSegment[] =
    overrideLabel && derived.length > 0
      ? [...derived.slice(0, -1), { ...derived[derived.length - 1], label: overrideLabel }]
      : derived;
  const parentSegments = segments.slice(0, -1);

  return (
    <header
      className={cn(
        'ua-app-header sticky top-0 z-40 flex h-[var(--ua-utility-header-height)] items-center gap-2.5',
        'min-w-0 border-b pl-14 pr-5 md:px-5',
      )}
      style={{ borderBottomColor: 'var(--ua-border-subtle)' }}
    >
      {/* Sidebar collapse toggle */}
      {onToggleSidebar && (
        <button
          type="button"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleSidebar}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md',
            'text-[var(--ua-text-tertiary)] hover:text-[var(--ua-text-primary)]',
            'transition-colors duration-[var(--ua-duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
            'flex-shrink-0',
          )}
        >
          <Menu size={16} aria-hidden="true" />
        </button>
      )}

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-0 overflow-hidden">
        {parentSegments.map((seg, i) => {
          return (
            <span key={seg.href ?? seg.label} className="flex items-center gap-0">
              {i > 0 && (
                <ChevronRight
                  className="mx-1.5 h-3 w-3 flex-shrink-0 text-[var(--ua-text-tertiary)]"
                  aria-hidden="true"
                />
              )}
              {!seg.href ? (
                <span
                  className={cn(
                    'truncate',
                    'text-caption text-[var(--ua-text-secondary)]',
                  )}
                  aria-current={undefined}
                >
                  {seg.label}
                </span>
              ) : (
                <Link
                  href={seg.href}
                  prefetch={false}
                  className={cn(
                    'text-caption truncate text-[var(--ua-text-secondary)]',
                    'hover:text-[var(--ua-text-primary)] transition-colors duration-[var(--ua-duration-fast)]',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2 rounded-sm',
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
        <div className="flex min-w-0 max-w-full flex-shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}

      {/* Context credits — monthly metered usage (renders null on unmetered tiers) */}
      <ContextCreditsBadge />

      {/* ⌘K trigger */}
      <button
        type="button"
        aria-label="Search (⌘K)"
        onClick={openPalette}
        className={cn(
          'flex h-8 items-center gap-2 rounded-[var(--ua-radius-control)] px-2.5',
          'border border-transparent bg-transparent',
          'text-caption text-[var(--ua-text-secondary)]',
          'hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)]',
          'transition-colors duration-[var(--ua-duration-fast)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
          'flex-shrink-0',
        )}
      >
        <Search size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline font-mono text-xs opacity-60">⌘K</kbd>
      </button>

      <button
        type="button"
        aria-label="Data health"
        aria-expanded={healthOpen}
        onClick={() => setHealthOpen(true)}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-[var(--ua-radius-control)] px-2',
          'border border-transparent bg-transparent text-caption text-[var(--ua-text-secondary)]',
          'hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)]',
          'transition-colors duration-[var(--ua-duration-fast)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
          'flex-shrink-0',
        )}
      >
        <ShieldCheck size={14} aria-hidden="true" />
        <span className="hidden lg:inline">Data health</span>
      </button>

      <Link
        href="/settings/workspace/account"
        prefetch={false}
        aria-label="Settings"
        className="flex h-8 items-center gap-1.5 rounded-[var(--ua-radius-control)] border border-transparent px-2 text-caption text-[var(--ua-text-secondary)] transition-colors duration-[var(--ua-duration-fast)] hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2"
      >
        <Settings2 size={14} aria-hidden="true" />
        <span className="hidden lg:inline">Settings</span>
      </Link>

      <Link
        href="/help"
        prefetch={false}
        aria-label="Help"
        className="flex h-8 items-center gap-1.5 rounded-[var(--ua-radius-control)] border border-transparent px-2 text-caption text-[var(--ua-text-secondary)] transition-colors duration-[var(--ua-duration-fast)] hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2"
      >
        <CircleHelp size={14} aria-hidden="true" />
        <span className="hidden lg:inline">Help</span>
      </Link>

      <Link
        href="/notifications"
        prefetch={false}
        aria-label={resolvedUnreadCount > 0 ? `Notifications, ${resolvedUnreadCount} unread` : 'Notifications'}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ua-radius-control)] border border-transparent text-[var(--ua-text-secondary)] transition-colors duration-[var(--ua-duration-fast)] hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)]"
      >
        <Bell size={14} aria-hidden="true" />
        {resolvedUnreadCount > 0 ? <><span className="sr-only">{resolvedUnreadCount} unread</span><span aria-hidden="true" className="absolute -right-2 -top-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] px-1 text-[length:var(--ua-text-metadata-size)] font-medium tabular-nums text-[var(--ua-text-secondary)]">{resolvedUnreadCount > 99 ? '99+' : resolvedUnreadCount}</span></> : null}
      </Link>

      <AvatarMenu name={userName} email={userEmail} />

      <CommandPalette isOpen={paletteOpen} onClose={closePalette} permissions={permissions} />
      <DataHealthDrawer
        open={healthOpen}
        onClose={() => setHealthOpen(false)}
        connectionState={connectionState}
      />
    </header>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveFromPathname(pathname: string): BreadcrumbSegment[] {
  const segmentMap: Record<string, string> = {
    dashboard:   'Overview',
    overview:    'Overview',
    customers:   'Customers',
    claims:      'Cases',
    cases:       'Cases',
    financials:  'Financials',
    sources:     'Sources',
    controls:    'Controls',
    watchlist:   'Customer context',
    inbox:       'Cases',
    store:       'Dashboard',
    reports:     'Reports',
    notifications: 'Notifications',
    recoveries:  'Recoveries',
    partners:    'Partners',
    rules:       'Rules',
    chargebacks: 'Cases',
    onboarding:  'Onboarding',
    help:        'Help',
    settings:    'Settings',
    audit:       'Dashboard',
  };
  const pathMap: Record<string, string> = {
    'settings/audit-trail': 'Audit trail',
    'settings/data-privacy': 'Data & privacy',
    'settings/workspace': 'Workspace',
    'settings/product': 'Product',
    'settings/developers': 'Developers',
    'settings/legal': 'Legal',
    'settings/governance': 'Governance',
    chargebacks: 'Cases',
    'evidence-packages': 'Cases',
  };
  const breadcrumbHrefMap: Record<string, string> = {
    settings: '/settings/workspace/account',
    'settings/workspace': '/settings/workspace/account',
    'settings/product': '/settings/product/platform',
    'settings/developers': '/settings/developers/api-access',
    'settings/legal': '/settings/legal/agreements',
    'settings/governance': '/settings/governance/audit-trail',
  };

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Home' }];

  return parts.map((part, i) => {
    const pathKey = parts.slice(0, i + 1).join('/');
    // A dynamic id segment (UUID/opaque hash) must never render as a raw
    // truncated id. Fall back to the singular entity label for its section so
    // the breadcrumb reads cleanly even before a page-level ref override lands.
    const label = pathMap[pathKey]
      ?? segmentMap[part]
      ?? (isDynamicId(part) ? singularEntityLabel(parts[i - 1]) : humanize(part));
    const href = breadcrumbHrefMap[pathKey] ?? '/' + pathKey;
    return { label, href };
  });
}

const SINGULAR_ENTITY_LABELS: Record<string, string> = {
  losses: 'Loss',
  recoveries: 'Recovery',
  rules: 'Rule',
  flows: 'Flow',
  claims: 'Case',
  chargebacks: 'Chargeback',
  customers: 'Customer',
  orders: 'Order',
  disputes: 'Chargeback',
  refunds: 'Refund',
  returns: 'Return',
  shipments: 'Shipment',
  tickets: 'Ticket',
  runs: 'Run',
  integrations: 'Connection',
};

/** A path segment that is an opaque id rather than a readable route name. */
function isDynamicId(segment: string): boolean {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  // Long, mostly-hex or delimiter-less tokens read as ids, not route names.
  return segment.length > 16 && !/\s/.test(segment);
}

function singularEntityLabel(parentSegment: string | undefined): string {
  return (parentSegment && SINGULAR_ENTITY_LABELS[parentSegment]) || 'Detail';
}

function humanize(s: string): string {
  if (s.length > 16) return s.slice(0, 8) + '…';
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
