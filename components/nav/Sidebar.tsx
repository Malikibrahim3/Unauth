'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Home, Inbox, ListChecks, PlusSquare, Users, Star, LogOut, HelpCircle, Settings, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
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

const STORAGE_KEY = 'unauth.sidebar.collapsed';

function buildGroups(inboxCount = 0, watchlistCount = 0): NavGroup[] {
  return [
    { label: 'Workspace', items: [{ href: '/dashboard', label: 'Dashboard', icon: Home }, { href: '/inbox', label: 'Inbox', icon: Inbox, badge: inboxCount }] },
    { label: 'Audits', items: [{ href: '/upload', label: 'New audit', icon: PlusSquare, isPrimary: true }, { href: '/history', label: 'Audit history', icon: ListChecks }] },
    { label: 'Investigations', items: [{ href: '/customers', label: 'Customers', icon: Users }, { href: '/watchlist', label: 'Watchlist', icon: Star, badge: watchlistCount }, { href: '/chargebacks', label: 'Evidence packages', icon: ShieldCheck }] },
  ];
}

export default function Sidebar({ merchantName, userEmail, inboxCount = 0, watchlistCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') setCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isCollapsed = collapsed && !hoverExpanded;
  const groups = buildGroups(inboxCount, watchlistCount);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const sidebarContent = (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-[var(--surface-border)] bg-[var(--surface-base)] text-[var(--ink-primary)]',
        isCollapsed ? 'w-12' : 'w-48',
      )}
      onMouseEnter={() => collapsed && setHoverExpanded(true)}
      onMouseLeave={() => setHoverExpanded(false)}
    >
      <div className="flex h-14 items-center border-b border-[var(--surface-border)] px-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <UnauthLogo variant={isCollapsed ? 'mark' : 'dark'} />
          {!isCollapsed && <span className="t-heading">Unauth<span className="text-[var(--copper-bright)]">.</span></span>}
        </Link>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group.label}>
            {!isCollapsed && <div className="px-2 pb-2 t-label text-[var(--ink-tertiary)]">{group.label}</div>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex h-10 items-center gap-3 rounded-sm px-2 transition-colors',
                      active ? 'text-[var(--ink-primary)]' : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
                      item.isPrimary && 'border border-[var(--surface-border)] bg-[var(--surface-raised)]',
                    )}
                  >
                    {active && <span className="absolute left-0 top-0 h-full w-[3px] bg-[var(--copper-bright)]" />}
                    <Icon className={cn('h-4 w-4 flex-none', active ? 'text-[var(--copper-bright)]' : 'text-[var(--ink-tertiary)]')} />
                    {!isCollapsed && <span className="flex-1 truncate t-body">{item.label}</span>}
                    {!isCollapsed && item.badge ? <span className="t-caption text-[var(--ink-tertiary)]">{item.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--surface-border)] p-2">
        <button onClick={toggleCollapse} className="mb-2 w-full rounded-sm border border-[var(--surface-border)] px-2 py-2 text-left t-caption text-[var(--ink-secondary)]">
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
        {!isCollapsed && <div className="mb-2 truncate t-caption text-[var(--ink-tertiary)]">{merchantName ?? 'No merchant'}</div>}
        <div className="flex items-center justify-between">
          <span className="truncate t-caption text-[var(--ink-tertiary)]">{userEmail}</span>
          <button onClick={handleSignOut} className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return sidebarContent;
}
