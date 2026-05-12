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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

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
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'unauth.sidebar.collapsed';

function buildGroups(inboxCount = 0, watchlistCount = 0): NavGroup[] {
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
      ],
    },
    {
      label: 'Investigations',
      items: [
        { href: '/customers', label: 'Customers', icon: Users },
        { href: '/watchlist', label: 'Watchlist', icon: Star, badge: watchlistCount },
        { href: '/chargebacks', label: 'Evidence packages', icon: ShieldCheck },
      ],
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
        'group relative flex h-8 items-center gap-3 rounded-sm px-2',
        'text-body-sm font-medium',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
        active
          ? 'bg-[var(--bg-subtle)] text-[var(--text)] font-semibold'
          : item.isPrimary
            ? 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-subtle)]'
            : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]',
        collapsed && 'justify-center',
      )}
    >
      {/* 2px left-edge accent rail for active item */}
      {active && (
        <span
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full"
          style={{ background: 'var(--accent-500)' }}
          aria-hidden="true"
        />
      )}

      <Icon
        className={cn(
          'h-4 w-4 flex-shrink-0',
          active
            ? 'text-[var(--icon)]'
            : 'text-[var(--icon-muted)] group-hover:text-[var(--icon)]',
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
                'rounded-full px-1',
                'bg-[var(--bg-subtle)] text-[var(--text-muted)]',
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
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--risk-critical)]"
          aria-label={`${item.badge} items`}
        />
      )}
    </Link>
  );
}

function GroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 mx-3 h-px bg-[var(--border-subtle)]" />;
  return (
    <div className="mt-5 mb-1 px-2">
      <span
        className="block text-[10px] font-semibold uppercase tracking-widest leading-none"
        style={{ color: 'var(--text-subtle)' }}
      >
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
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const groups = buildGroups(inboxCount, watchlistCount);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const sidebarContent = (isMobile = false) => (
    <aside
      className={cn(
        'relative flex h-full flex-shrink-0 flex-col',
        'bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]',
        isMobile
          ? 'w-72'
          : cn(
              'transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out)]',
              'overflow-hidden',
              collapsed ? 'w-14' : 'w-60',
            ),
      )}
    >
      {/* Logo / merchant */}
      <div
        className={cn(
          'flex h-14 flex-shrink-0 items-center border-b border-[var(--border-subtle)]',
          collapsed ? 'justify-center px-0' : 'gap-2 px-3',
        )}
      >
        <div className="flex-shrink-0 flex items-center justify-center">
          <UnauthLogo variant="mark" size={28} />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <UnauthLogo variant="wordmark-light" size={20} />
            {merchantName && (
              <div className="text-caption text-[var(--text-muted)] truncate mt-0.5">{merchantName}</div>
            )}
          </div>
        )}

        {!collapsed && (
          <button
            type="button"
            aria-label="Collapse sidebar"
            onClick={toggleCollapse}
            className={cn(
              'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm',
              'text-[var(--icon-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--icon)]',
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
        className={cn('flex-1 overflow-y-auto overflow-x-hidden', collapsed ? 'px-2 py-3' : 'px-2 py-2')}
        aria-label="Main navigation"
      >
        {groups.map((group) => (
          <div key={group.label}>
            <GroupLabel label={group.label} collapsed={collapsed} />
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
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
          'flex flex-shrink-0 flex-col border-t border-[var(--border-subtle)]',
          collapsed ? 'items-center gap-1 px-2 py-2' : 'gap-0.5 px-2 py-2',
        )}
      >
        {!collapsed && (
          <div className="px-2 py-1 text-caption text-[var(--text-subtle)] truncate">
            {userEmail}
          </div>
        )}

        <Link
          href="/help"
          title={collapsed ? 'Help' : undefined}
          className={cn(
            'flex h-8 items-center gap-3 rounded-sm px-2',
            'text-body-sm text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
            collapsed && 'justify-center',
          )}
        >
          <HelpCircle className="h-4 w-4 flex-shrink-0 text-[var(--icon-muted)]" aria-hidden="true" />
          {!collapsed && <span>Help</span>}
        </Link>

        <Link
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={cn(
            'flex h-8 items-center gap-3 rounded-sm px-2',
            'text-body-sm text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
            collapsed && 'justify-center',
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0 text-[var(--icon-muted)]" aria-hidden="true" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex h-8 w-full items-center gap-3 rounded-sm px-2',
            'text-body-sm text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
            collapsed && 'justify-center',
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0 text-[var(--icon-muted)]" aria-hidden="true" />
          {!collapsed && <span>Sign out</span>}
        </button>

        {/* Legal links — small muted text, visible only when expanded */}
        {!collapsed && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 px-2 pb-1">
            {[
              { href: '/legal/privacy', label: 'Privacy' },
              { href: '/legal/data-handling', label: 'Data handling' },
              { href: '/legal/dpa', label: 'DPA' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[11px] text-[var(--text-subtle)] hover:text-[var(--text-muted)] hover:underline transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Expand toggle when collapsed */}
        {collapsed && (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={toggleCollapse}
            className={cn(
              'mt-1 flex h-7 w-7 items-center justify-center rounded-sm',
              'text-[var(--icon-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--icon)]',
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
