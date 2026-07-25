'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Bell, ChevronRight, Menu, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommandPalette from './CommandPalette';
import { useBreadcrumbOverride } from './BreadcrumbOverrideContext';
import { MerchantEnvChip } from './MerchantEnvChip';
import { AvatarMenu } from './AvatarMenu';
import { ContextCreditsBadge } from './ContextCreditsBadge';
import { WorkspaceSwitcher, type WorkspaceOption } from './WorkspaceSwitcher';
import type { Permission } from '@/lib/permissions';
import { useFetchJson } from '@/lib/react/useFetchJson';

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
  /** Deployment environment, e.g. 'production' | 'preview' | 'development' */
  environment?: string;
  /** Demo/sample tenant — surfaces a "Demo" pill instead of an env badge */
  isDemo?: boolean;
  /** Authenticated user email for the avatar menu */
  userEmail?: string | null;
  workspaces?: WorkspaceOption[];
  activeMerchantId?: string | null;
  unreadCount?: number;
  permissions?: Permission[];
}

/**
 * AppHeader - 56px sticky header per §3.3.
 * Renders breadcrumbs in the center-left region; ⌘K trigger and avatar slot on the right.
 */
export default function AppHeader({
  breadcrumbs,
  actions,
  onToggleSidebar,
  sidebarCollapsed,
  merchantName,
  environment,
  isDemo,
  userEmail,
  workspaces = [],
  activeMerchantId,
  unreadCount = 0,
  permissions = [],
}: AppHeaderProps) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data: notificationSummary } = useFetchJson<{ unreadCount?: number }>(
    '/api/notifications/unread-count',
  );
  const resolvedUnreadCount = notificationSummary?.unreadCount ?? unreadCount;

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

  return (
    <header
      className={cn(
        'ua-app-header sticky top-0 z-40 flex h-12 items-center gap-3',
        'border-b pl-14 pr-4 md:px-4',
      )}
      style={{ borderBottomColor: 'var(--ua-border-default)' }}
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
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-0">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <span key={seg.href ?? seg.label} className="flex items-center gap-0">
              {i > 0 && (
                <ChevronRight
                  className="mx-1.5 h-3 w-3 flex-shrink-0 text-[var(--ua-text-tertiary)]"
                  aria-hidden="true"
                />
              )}
              {isLast || !seg.href ? (
                <span
                  className={cn(
                    'truncate',
                    isLast
                      ? 'text-[length:var(--ua-text-small-size)] font-semibold text-[var(--ua-text-primary)]'
                      : 'text-caption text-[var(--ua-text-secondary)]',
                  )}
                  aria-current={isLast ? 'page' : undefined}
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
        <div className="flex flex-shrink-0 items-center gap-2">
          {actions}
        </div>
      )}

      {/* Context credits — monthly metered usage (renders null on unmetered tiers) */}
      <ContextCreditsBadge />

      {/* MerchantEnvChip - left of search */}
      {workspaces.length > 1 ? (
        <WorkspaceSwitcher workspaces={workspaces} activeMerchantId={activeMerchantId ?? null} />
      ) : (
        <MerchantEnvChip merchantName={merchantName ?? null} environment={environment} isDemo={isDemo} />
      )}

      {/* ⌘K trigger */}
      <button
        type="button"
        aria-label="Search (⌘K)"
        onClick={openPalette}
        className={cn(
          'flex h-7 items-center gap-1.5 px-2',
          'border border-[var(--ua-border-default)]',
          'text-caption text-[var(--ua-text-tertiary)]',
          'hover:border-[var(--ua-border-default)] hover:text-[var(--ua-text-primary)]',
          'transition-colors duration-[var(--ua-duration-fast)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
          'flex-shrink-0',
        )}
        style={{ background: 'var(--ua-surface-primary)', borderRadius: 'var(--ua-radius-control)' }}
      >
        <Search size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline font-mono text-xs opacity-60">⌘K</kbd>
      </button>

      <Link
        href="/notifications"
        prefetch={false}
        aria-label={resolvedUnreadCount > 0 ? `Notifications, ${resolvedUnreadCount} unread` : 'Notifications'}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[var(--ua-text-tertiary)] hover:text-[var(--ua-text-primary)]"
        style={{ borderColor: 'var(--ua-border-default)', background: 'var(--ua-surface-primary)' }}
      >
        <Bell size={14} aria-hidden="true" />
        {resolvedUnreadCount > 0 ? <span className="sr-only">{resolvedUnreadCount} unread</span> : null}
      </Link>

      <AvatarMenu email={userEmail} />

      <CommandPalette isOpen={paletteOpen} onClose={closePalette} permissions={permissions} />
    </header>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveFromPathname(pathname: string): BreadcrumbSegment[] {
  const segmentMap: Record<string, string> = {
    dashboard:   'Overview',
    customers:   'Customers',
    claims:      'Cases',
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
    chargebacks: 'Cases',
    'evidence-packages': 'Cases',
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
    const href = '/' + pathKey;
    return { label, href };
  });
}

const SINGULAR_ENTITY_LABELS: Record<string, string> = {
  losses: 'Loss',
  recoveries: 'Recovery',
  rules: 'Rule',
  flows: 'Flow',
  claims: 'Payout case',
  chargebacks: 'Case',
  customers: 'Customer',
  orders: 'Order',
  disputes: 'Dispute',
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
