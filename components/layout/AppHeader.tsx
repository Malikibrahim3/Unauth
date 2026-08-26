'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, UserRound } from 'lucide-react';
import CommandPalette from './CommandPalette';
import type { Permission } from '@/lib/permissions';
import { useFetchJson } from '@/lib/react/useFetchJson';

export interface BreadcrumbSegment { label: string; href?: string }
interface AppHeaderProps { breadcrumbs?: BreadcrumbSegment[]; actions?: React.ReactNode; onToggleSidebar?: () => void; sidebarCollapsed?: boolean; userName?: string | null; userEmail?: string | null; unreadCount?: number; permissions?: Permission[] }

function sectionName(pathname: string) { const segment = pathname.split('/').filter(Boolean)[0] ?? 'overview'; return segment === 'financials' ? 'Financials' : segment.charAt(0).toUpperCase() + segment.slice(1); }

export default function AppHeader({ actions, userName, userEmail, unreadCount = 0, permissions = [] }: AppHeaderProps) {
  const pathname = usePathname(); const [paletteOpen, setPaletteOpen] = useState(false); const { data } = useFetchJson<{ unreadCount?: number }>('/api/notifications/unread-count'); const count = data?.unreadCount ?? unreadCount;
  const open = useCallback(() => setPaletteOpen(true), []);
  useEffect(() => { const listener = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); setPaletteOpen((value) => !value); } }; document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener); }, []);
  return (
    <header className="ua-app-header">
      <div className="ua-app-header__context"><span>Workspace</span><strong>{sectionName(pathname)}</strong></div>
      {/* All controls here render at --uo-route-control-height-icon (32px), so their
          glyphs share one size — --uo-route-icon-md (16px) — rather than each
          hardcoding its own value. */}
      <div className="ua-app-header__actions">{actions}<button type="button" className="ua-command-trigger" aria-label="Search and navigate" onClick={open}><Search size={16} /><span>Search</span><kbd>⌘K</kbd></button><Link className="ua-header-icon" href="/notifications" prefetch={false} aria-label={count ? `${count} unread notifications` : 'Notifications'}><Bell size={16} />{count ? <small>{count > 99 ? '99+' : count}</small> : null}</Link><Link className="ua-header-account" href="/settings/workspace/account" prefetch={false}><UserRound size={16} /><span>{userName ?? userEmail ?? 'Account'}</span></Link></div>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} permissions={permissions} />
    </header>
  );
}
