'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getSidebarNavItems, isAppRouteActive } from '@/lib/navigation/appRoutes';
import type { Permission } from '@/lib/permissions';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { WorkspaceOption } from '@/components/layout/WorkspaceSwitcher';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import AppNavLink from '@/components/navigation/AppNavLink';

export interface SidebarProps { merchantName: string | null; userName?: string | null; userEmail: string; claimsCount?: number; connectionState?: Pick<ConnectionState, 'orderSourceConnected' | 'helpdesk' | 'helpdeskProvider'>; workspaces?: WorkspaceOption[]; activeMerchantId?: string | null; permissions?: Permission[] }

export function SidebarInner({ merchantName, userName, userEmail, claimsCount = 0, workspaces = [], activeMerchantId = null, permissions = [] }: SidebarProps) {
  const pathname = usePathname(); const router = useRouter(); const [collapsed, setCollapsed] = useState(false); const [switching, setSwitching] = useState(false); const [switchError, setSwitchError] = useState<string | null>(null);
  const groups = getSidebarNavItems(new Set(permissions));
  async function switchWorkspace(merchantId: string) {
    setSwitching(true);
    setSwitchError(null);
    try {
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ merchantId }),
      });
      if (response.ok) router.refresh();
      else setSwitchError('Could not switch workspace. Try again.');
    } catch {
      setSwitchError('Could not switch workspace. Try again.');
    } finally {
      setSwitching(false);
    }
  }
  async function signOut() { await createClient().auth.signOut(); router.push('/login'); }

  const contents = (
    <aside className={`ua-primary-nav ${collapsed ? 'ua-primary-nav--collapsed' : ''}`} aria-label="Workspace navigation">
      <div className="ua-primary-nav__brand"><AppNavLink href="/overview" aria-label="Unauth overview"><UnauthLogo kind={collapsed ? 'symbol' : 'lockup'} tone="graphite" background="transparent" height={20} priority /></AppNavLink><button type="button" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button></div>
      {!collapsed ? <label className="ua-workspace-select"><span>Workspace</span><select value={activeMerchantId ?? ''} disabled={switching} onChange={(event) => void switchWorkspace(event.target.value)}>{workspaces.length ? workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>) : <option value="">{merchantName ?? 'Workspace'}</option>}</select>{switchError ? <small className="ua-text-metadata !text-[var(--uo-route-critical)]" role="alert">{switchError}</small> : null}</label> : null}
      <nav className="ua-primary-nav__groups" aria-label="Main navigation">{groups.map((group) => <section key={group.label}><p>{collapsed ? <span className="sr-only">{group.label}</span> : group.label}</p><ul>{group.items.map((route) => { const Icon = route.icon; const active = isAppRouteActive(pathname, route); return <li key={route.key}><AppNavLink href={route.href} active={active} aria-current={active ? 'page' : undefined} title={collapsed ? route.label : undefined}>{Icon ? <Icon size={17} aria-hidden="true" /> : null}{!collapsed ? <span>{route.label}</span> : null}{!collapsed && route.key === 'claims' && claimsCount > 0 ? <small>{claimsCount}</small> : null}</AppNavLink></li>; })}</ul></section>)}</nav>
      <div className="ua-primary-nav__account"><div aria-hidden="true">{(userName ?? userEmail).slice(0, 1).toUpperCase()}</div>{!collapsed ? <span><strong>{userName ?? 'Account'}</strong><small>{userEmail}</small></span> : null}<button type="button" aria-label="Sign out" onClick={() => void signOut()}><LogOut size={16} /></button></div>
    </aside>
  );

  return <div className="ua-sidebar-desktop">{contents}</div>;
}
