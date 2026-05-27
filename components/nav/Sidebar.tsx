'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Home,
  Inbox,
  ListChecks,
  PlusSquare,
  Users,
  Star,
  LogOut,
  HelpCircle,
  Settings,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  FileWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import ThemeToggle from '@/components/common/ThemeToggle';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  /** When true, renders with a filled/verb visual treatment */
  isPrimary?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  merchantName: string | null;
  userEmail: string;
  inboxCount?: number;
  watchlistCount?: number;
  claimsCount?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'unauth.sidebar.collapsed';

function buildGroups(inboxCount = 0, watchlistCount = 0, claimsCount = 0): NavGroup[] {
  const investigationItems: NavItem[] = [
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/claims', label: 'Claims', icon: FileWarning, badge: claimsCount > 0 ? claimsCount : undefined },
    { href: '/watchlist', label: 'Watchlist', icon: Star, badge: watchlistCount },
    { href: '/chargebacks', label: 'Evidence packages', icon: ShieldCheck },
  ];
  return [
    {
      label: 'Workspace',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: Home },
        { href: '/inbox',     label: 'Inbox', icon: Inbox, badge: inboxCount },
      ],
    },
    {
      label: 'Audits',
      items: [
        { href: '/upload', label: 'New audit', icon: PlusSquare, isPrimary: true },
        { href: '/history', label: 'Audit history', icon: ListChecks },
        { href: '/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      label: 'Investigations',
      items: investigationItems,
    },
  ];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SidebarItem({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex h-8 items-center gap-3 rounded-none px-2',
        'text-[13px] font-medium',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
        active
          ? 'text-[var(--ink-primary)] font-semibold'
          : item.isPrimary
            ? 'border border-[var(--surface-border)] bg-transparent text-[var(--ink-primary)] hover:text-[var(--copper-bright)]'
            : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
        collapsed && 'justify-center',
      )}
    >
      {/* 2px left-edge accent rail for active item */}
      {active && (
        <span
          className="absolute left-0 top-0 bottom-0 rounded-r-sm"
          style={{ background: 'var(--copper-bright)', width: 3 }}
          aria-hidden="true"
        />
      )}

      <Icon
        className={cn(
          'h-4 w-4 flex-shrink-0',
          active
            ? 'text-[var(--copper-bright)]'
            : 'text-[var(--ink-tertiary)] group-hover:text-[var(--ink-secondary)]',
        )}
        aria-hidden="true"
      />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {!!item.badge && item.badge > 0 && (
            <span
              className={cn(
                'inline-flex h-[18px] min-w-[18px] items-center justify-center',
                'rounded-sm px-1',
                'bg-[var(--surface-muted)] text-[var(--ink-secondary)]',
                'text-caption font-mono tabular-nums',
              )}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}

      {collapsed && !!item.badge && item.badge > 0 && (
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--sev-definite)]"
          aria-label={`${item.badge} items`}
        />
      )}
    </Link>
  );
}

function GroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 mx-2 h-px bg-[var(--surface-border)]" />;
  return (
    <div className="mt-5 mb-1 px-2">
      <span
        className="block text-[10px] font-semibold uppercase leading-none"
        style={{ color: 'var(--ink-tertiary)', letterSpacing: '0.04em' }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 4,
            height: 4,
            borderRadius: 1,
            background: 'var(--copper-bright)',
            marginRight: 7,
            verticalAlign: '2px',
          }}
        />
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Sidebar({
  merchantName,
  userEmail,
  inboxCount = 0,
  watchlistCount = 0,
  claimsCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // When the sidebar is collapsed and the user hovers, we temporarily expand it.
  // "pinned" = user explicitly toggled; "hover" = transient expansion.
  const [hoverExpanded, setHoverExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setCollapsed(true);
    } catch { /* SSR guard */ }
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const groups = buildGroups(inboxCount, watchlistCount, claimsCount);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  // Effective collapsed state: collapsed only if pinned AND not hovering
  const isCollapsed = collapsed && !hoverExpanded;

  const sidebarContent = (isMobile = false) => (
    <aside
      className={cn(
        'relative flex h-full flex-shrink-0 flex-col',
        'border-r border-[var(--surface-border)]',
        isMobile
          ? 'w-72'
          : cn(
              'transition-[width] duration-[390ms] ease-[var(--ease-out)]',
              'overflow-hidden',
              isCollapsed ? 'w-14' : 'w-60',
            ),
      )}
      style={{ background: 'var(--surface-base)' }}
      onMouseEnter={() => { if (collapsed) setHoverExpanded(true); }}
      onMouseLeave={() => { if (collapsed) setHoverExpanded(false); }}
    >
      {/* Logo / merchant */}
      <div
        className={cn(
          'flex flex-shrink-0 border-b border-[var(--surface-border)] px-3',
          isCollapsed ? 'h-16 flex-col items-center justify-center gap-1 py-1.5' : 'h-14 items-center gap-2',
        )}
      >
        <div className="flex min-w-0 flex-shrink-0 items-baseline justify-center overflow-hidden leading-none translate-y-[-9%]">
          <UnauthLogo
            variant="auto"
            size={isCollapsed ? 9 : 24}
          />
        </div>

        {!isCollapsed ? (
          <div className="min-w-0 flex flex-1 items-baseline -translate-x-[9%] -translate-y-[3%] truncate text-[20px] font-semibold text-[var(--ink-primary)] leading-none">
            <span className="mx-1 inline-flex items-baseline self-baseline -translate-y-[14%] text-[14px] text-[var(--ink-tertiary)]">x</span>
            <span className="truncate text-[var(--ink-secondary)]">{merchantName ?? ''}</span>
          </div>
        ) : (
          <div className="w-full truncate text-center text-[9px] leading-none text-[var(--ink-tertiary)]">
            {merchantName ?? ''}
          </div>
        )}

        {!isCollapsed && (
          <button
            type="button"
            aria-label="Collapse sidebar"
            onClick={toggleCollapse}
            className={cn(
              'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm',
              'text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]',
              'transition-colors duration-[var(--duration-fast)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
            )}
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={cn('flex-1 overflow-y-auto overflow-x-hidden', isCollapsed ? 'px-2 py-3' : 'px-2 py-2')}
        aria-label="Main navigation"
      >
        {groups.map((group) => (
          <div key={group.label}>
            <GroupLabel label={group.label} collapsed={isCollapsed} />
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  item={item}
                  collapsed={isCollapsed}
                  active={isActive(item.href)}
                />
              ))}
            </div>
          </div>
        ))}


      </nav>

      {/* Footer */}
      <div
        className={cn(
          'flex flex-shrink-0 flex-col border-t border-[var(--surface-border)]',
          isCollapsed ? 'items-center gap-1 px-2 py-2' : 'gap-0.5 px-2 py-2',
        )}
      >
        {!isCollapsed && (
          <div className="px-2 py-1 text-caption text-[var(--ink-tertiary)] truncate">
            {userEmail}
          </div>
        )}

        <Link
          href="/help"
          title={isCollapsed ? 'Help' : undefined}
          className={cn(
            'flex h-8 items-center gap-3 rounded-sm px-2',
            'text-body-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
            isCollapsed && 'justify-center',
          )}
        >
          <HelpCircle className="h-4 w-4 flex-shrink-0 text-[var(--ink-tertiary)]" aria-hidden="true" />
          {!isCollapsed && <span>Help</span>}
        </Link>

        <Link
          href="/settings"
          title={isCollapsed ? 'Settings' : undefined}
          className={cn(
            'flex h-8 items-center gap-3 rounded-sm px-2',
            'text-body-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
            isCollapsed && 'justify-center',
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0 text-[var(--ink-tertiary)]" aria-hidden="true" />
          {!isCollapsed && <span>Settings</span>}
        </Link>

        <div className={cn('px-2 py-1', isCollapsed && 'flex justify-center px-0')}>
          <ThemeToggle className={isCollapsed ? 'h-8 w-8' : undefined} />
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          title={isCollapsed ? 'Sign out' : undefined}
          className={cn(
            'flex h-8 w-full items-center gap-3 rounded-sm px-2',
            'text-body-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
            isCollapsed && 'justify-center',
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0 text-[var(--ink-tertiary)]" aria-hidden="true" />
          {!isCollapsed && <span>Sign out</span>}
        </button>

        {/* Legal links — small muted text, visible only when expanded */}
        {!isCollapsed && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 px-2 pb-1">
            {[
              { href: '/legal/privacy', label: 'Privacy' },
              { href: '/legal/data-handling', label: 'Data handling' },
              { href: '/legal/dpa', label: 'DPA' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[11px] text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)] hover:underline transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Expand toggle when collapsed */}
        {isCollapsed && (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={toggleCollapse}
            className={cn(
              'mt-1 flex h-7 w-7 items-center justify-center rounded-sm',
              'text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]',
              'transition-colors duration-[var(--duration-fast)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
            )}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block h-full">
        {sidebarContent(false)}
      </div>

      {/* Mobile hamburger toggle — visible only on mobile */}
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
        className={cn(
          'md:hidden fixed top-3 left-3 z-50',
          'flex h-9 w-9 items-center justify-center rounded-md',
          'bg-[var(--bg-surface)] border border-[var(--border-subtle)]',
          'text-[var(--icon-muted)] hover:text-[var(--icon)]',
          'shadow-sm transition-colors',
        )}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="md:hidden fixed inset-y-0 left-0 z-50 h-full">
            {sidebarContent(true)}
          </div>
        </>
      )}
    </>
  );
}
