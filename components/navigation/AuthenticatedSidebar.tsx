'use client';

import { Fragment, useState, useSyncExternalStore, type KeyboardEvent, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Permission } from '@/lib/permissions';
import { getSidebarNavItems, type AppRouteKey } from '@/lib/navigation/appRoutes';
import { formatNumber } from '@/lib/utils/format';
import AppNavLink from './AppNavLink';
import type { WorkspaceOption } from '@/components/layout/WorkspaceSwitcher';

type SidebarIconName = 'overview' | 'work' | 'cases' | 'customers' | 'loss' | 'recovery' | 'reconciliation' | 'reports' | 'rules' | 'flows' | 'connected' | 'imports' | 'settings' | 'notifications' | 'help';

const SIDEBAR_ICONS: Record<AppRouteKey, SidebarIconName> = {
  dashboard: 'overview',
  work: 'work',
  customers: 'customers',
  claims: 'cases',
  losses: 'loss',
  recoveries: 'recovery',
  reconciliation: 'reconciliation',
  reports: 'reports',
  integrations: 'connected',
  imports: 'imports',
  rules: 'rules',
  flows: 'flows',
  settings: 'settings',
  notifications: 'notifications',
  help: 'help',
};

function SidebarIcon({ name, size = 14 }: { name: SidebarIconName; size?: number }) {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'overview') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><rect x="1.8" y="1.8" width="4.3" height="4.3" rx="1" {...line}/><rect x="7.9" y="1.8" width="4.3" height="4.3" rx="1" {...line}/><rect x="1.8" y="7.9" width="4.3" height="4.3" rx="1" {...line}/><rect x="7.9" y="7.9" width="4.3" height="4.3" rx="1" {...line}/></svg>;
  if (name === 'work') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="2" width="10" height="10" rx="2.4" {...line}/><path d="M4.7 7.1 6.3 8.7 9.3 5.3" {...line}/></svg>;
  if (name === 'cases') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2 12.2 4.6 7 7.2 1.8 4.6Z" {...line}/><path d="M1.8 7.5 7 10.1l5.2-2.6" {...line}/></svg>;
  if (name === 'customers') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="5" r="2.3" {...line}/><path d="M2.9 11.9c0-2.2 1.8-3.7 4.1-3.7s4.1 1.5 4.1 3.7" {...line}/></svg>;
  if (name === 'loss') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M2.3 3.3h9.4M2.3 7h9.4M2.3 10.7h5.6" {...line}/></svg>;
  if (name === 'recovery') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M12 7a5 5 0 1 1-1.6-3.7" {...line}/><path d="M12.2 2.4V5H9.6" {...line}/></svg>;
  if (name === 'reconciliation') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M2.3 4.9h9.4M2.3 9.1h9.4M9.6 3.1 4.4 10.9" {...line}/></svg>;
  if (name === 'reports') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M2.6 11.5V7.3M6.2 11.5V3.4M9.8 11.5V8.7" {...line}/></svg>;
  if (name === 'rules') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M2.2 4.5h9.6M2.2 9.5h9.6" {...line}/><circle cx="5.3" cy="4.5" r="1.5" fill="#fff"/><circle cx="8.7" cy="9.5" r="1.5" fill="#fff"/></svg>;
  if (name === 'flows') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><circle cx="3.7" cy="3.7" r="1.7" {...line}/><circle cx="10.3" cy="10.3" r="1.7" {...line}/><path d="M3.7 5.4v3.4a1.7 1.7 0 0 0 1.7 1.7h3" {...line}/></svg>;
  if (name === 'connected') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M5.6 8.4 8.4 5.6" {...line}/><path d="M7.5 4.3 8.9 2.9a2.4 2.4 0 0 1 3.3 3.3l-1.4 1.4" {...line}/><path d="M6.5 9.7 5.1 11.1a2.4 2.4 0 0 1-3.3-3.3l1.4-1.4" {...line}/></svg>;
  if (name === 'imports') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2.4v6M4.6 6 7 8.4 9.4 6M2.6 11.3h8.8" {...line}/></svg>;
  if (name === 'settings') return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="7" cy="7" r="2.1"/><path d="M7 1.9v1.4M7 10.7v1.4M1.9 7h1.4M10.7 7h1.4M3.4 3.4l1 1M9.6 9.6l1 1M10.6 3.4l-1 1M4.4 9.6l-1 1"/></svg>;
  if (name === 'notifications') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M3.4 6a3.6 3.6 0 0 1 7.2 0c0 2.4.9 3.4.9 3.4H2.5s.9-1 .9-3.4Z" {...line}/><path d="M5.9 11.2a1.3 1.3 0 0 0 2.2 0" {...line}/></svg>;
  return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.2" {...line}/><path d="M5.6 5.4a1.5 1.5 0 1 1 1.9 1.7v.8" {...line}/><circle cx="7" cy="10" r=".5" fill="currentColor" stroke="none"/></svg>;
}

function RailIcon({ name }: { name: 'overview' | 'reports' | 'cases' | 'document' | 'flows' | 'settings' }) {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'overview') return <SidebarIcon name="overview" size={15}/>;
  if (name === 'reports') return <svg width="15" height="15" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.2 11.4V7.6M6 11.4V3.2M9.8 11.4V8.8" {...line}/></svg>;
  if (name === 'cases') return <svg width="15" height="15" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 4.1a1.6 1.6 0 0 1 1.6-1.6h6.8A1.6 1.6 0 0 1 12 4.1v3.6a1.6 1.6 0 0 1-1.6 1.6H6.2L3.4 11.6V9.3h-.2A1.6 1.6 0 0 1 2 7.7Z" {...line}/></svg>;
  if (name === 'document') return <svg width="15" height="15" viewBox="0 0 14 14" aria-hidden="true"><path d="M3.4 1.9h4.3l2.9 2.9v7.3H3.4Z" {...line}/><path d="M7.6 1.9v3h2.9" {...line}/></svg>;
  if (name === 'flows') return <svg width="15" height="15" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="3.2" r="1.5" {...line}/><circle cx="3.3" cy="10.6" r="1.5" {...line}/><circle cx="10.7" cy="10.6" r="1.5" {...line}/><path d="M7 4.7v2.6M5.9 8.2 4.3 9.4M8.1 8.2l1.6 1.2" {...line}/></svg>;
  return <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="2.1"/><path d="M7 1.6v1.6M7 10.8v1.6M1.6 7h1.6M10.8 7h1.6M3.2 3.2l1.1 1.1M9.7 9.7l1.1 1.1M10.8 3.2 9.7 4.3M4.3 9.7 3.2 10.8"/></svg>;
}

function initials(value: string | null | undefined) {
  const words = (value ?? '').trim().split(/\s+/).filter(Boolean);
  return words.length ? words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() : 'NA';
}

const railRoutes = [
  { href: '/overview', label: 'Overview', icon: 'overview' },
  { href: '/financials/reports', label: 'Reports', icon: 'reports' },
  { href: '/cases', label: 'Cases', icon: 'cases' },
  { href: '/sources/imports', label: 'Imports', icon: 'document' },
  { href: '/controls/flows', label: 'Flows', icon: 'flows' },
] as const;

const compactDeskQuery = '(max-width: 1280px)';

function subscribeCompactDesk(listener: () => void) {
  const query = window.matchMedia(compactDeskQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

function compactDeskSnapshot() {
  return window.matchMedia(compactDeskQuery).matches;
}

function compactDeskServerSnapshot() {
  return false;
}

function activateRoute(router: ReturnType<typeof useRouter>, href: string) {
  router.push(href);
}

function keyboardRoute(event: KeyboardEvent<HTMLElement>, router: ReturnType<typeof useRouter>, href: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  activateRoute(router, href);
}

function hoverIn(event: MouseEvent<HTMLElement>) {
  if (event.currentTarget.getAttribute('aria-current') !== 'page') event.currentTarget.style.background = '#f4f2ef';
}

function hoverOut(event: MouseEvent<HTMLElement>) {
  if (event.currentTarget.getAttribute('aria-current') !== 'page') event.currentTarget.style.background = 'transparent';
}

export function AuthenticatedSidebar({
  workspaceName,
  workspaces = [],
  activeMerchantId = null,
  userName,
  userRole = 'Workspace member',
  workCount,
  caseCount,
  reconciliationCount,
  sourceTone = 'neutral',
  activeHref = '/overview',
  permissions,
}: {
  workspaceName?: string | null;
  workspaces?: WorkspaceOption[];
  activeMerchantId?: string | null;
  userName?: string | null;
  userRole?: string;
  workCount?: number;
  caseCount?: number;
  reconciliationCount?: number;
  sourceTone?: 'green' | 'amber' | 'red' | 'neutral';
  activeHref?: string;
  permissions?: Permission[];
}) {
  const router = useRouter();
  const groups = getSidebarNavItems(permissions ? new Set(permissions) : undefined);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspacePending, setWorkspacePending] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [railHint, setRailHint] = useState<string | null>(null);
  const compactDesk = useSyncExternalStore(subscribeCompactDesk, compactDeskSnapshot, compactDeskServerSnapshot);
  const name = workspaceName?.trim() || 'Workspace';

  async function switchWorkspace(merchantId: string) {
    if (merchantId === activeMerchantId || workspacePending) return;
    setWorkspacePending(true);
    setWorkspaceError(null);
    try {
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ merchantId }),
      });
      if (!response.ok) throw new Error('Workspace could not be changed.');
      setWorkspaceMenuOpen(false);
      router.refresh();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Workspace could not be changed.');
    } finally {
      setWorkspacePending(false);
    }
  }

  return (
    <>
      <div aria-label="Primary workspace navigation" role="navigation" style={{ width: 56, flex: 'none', background: '#ffffff', borderRight: '1px solid #e4e3e0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 8, position: 'relative', zIndex: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 9, background: '#1c1f23', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="5.2"/><path d="M4.4 9.6 9.6 4.4"/></svg>
        </div>
        {railRoutes.map((item) => {
          const active = activeHref === item.href;
          return (
            <div
              key={item.href}
              role="link"
              tabIndex={0}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => activateRoute(router, item.href)}
              onKeyDown={(event) => keyboardRoute(event, router, item.href)}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
              onFocus={() => setRailHint(item.label)}
              onBlur={() => setRailHint(null)}
              title={compactDesk ? item.label : undefined}
              {...{ 'style-hover': 'background:#f4f2ef' }}
              style={{ width: 32, height: 32, borderRadius: 9, background: active ? '#f2f0ed' : 'transparent', boxShadow: active ? 'inset 0 0 0 1px rgba(28,27,25,.07)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#1c1f23' : '#64686d', cursor: 'pointer', position: 'relative' }}
            ><RailIcon name={item.icon}/>{compactDesk && railHint === item.label ? <span aria-hidden="true" style={{ position: 'absolute', left: 40, top: 4, padding: '6px 8px', borderRadius: 7, background: '#1c1f23', color: '#fff', boxShadow: '0 6px 18px rgba(28,27,25,.18)', font: "500 11px/1 'Inter',sans-serif", whiteSpace: 'nowrap' }}>{item.label}</span> : null}</div>
          );
        })}
        <div style={{ flex: 1 }}/>
        <AppNavLink href="/settings/workspace/account" aria-label="Settings" title={compactDesk ? 'Settings' : undefined} onFocus={() => setRailHint('Settings')} onBlur={() => setRailHint(null)} style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64686d', position: 'relative' }}><RailIcon name="settings"/>{compactDesk && railHint === 'Settings' ? <span aria-hidden="true" style={{ position: 'absolute', left: 40, top: 4, padding: '6px 8px', borderRadius: 7, background: '#1c1f23', color: '#fff', boxShadow: '0 6px 18px rgba(28,27,25,.18)', font: "500 11px/1 'Inter',sans-serif", whiteSpace: 'nowrap' }}>Settings</span> : null}</AppNavLink>
      </div>

      <div aria-label="Workspace navigation" role="navigation" hidden={compactDesk} style={{ width: 238, flex: 'none', background: '#ffffff', borderRight: '1px solid #e4e3e0', display: compactDesk ? 'none' : 'flex', flexDirection: 'column', padding: '14px 0 0', position: 'relative' }}>
        <div style={{ padding: '0 14px 14px' }}>
          <div
            role={workspaces.length > 1 ? 'button' : undefined}
            tabIndex={workspaces.length > 1 ? 0 : undefined}
            aria-expanded={workspaces.length > 1 ? workspaceMenuOpen : undefined}
            aria-label={workspaces.length > 1 ? 'Switch active workspace' : undefined}
            onClick={() => workspaces.length > 1 && setWorkspaceMenuOpen((open) => !open)}
            onKeyDown={(event) => {
              if (workspaces.length < 2 || (event.key !== 'Enter' && event.key !== ' ')) return;
              event.preventDefault();
              setWorkspaceMenuOpen((open) => !open);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 9, boxShadow: '0 0 0 1px rgba(28,27,25,.1),0 1px 2px rgba(28,27,25,.05)', cursor: workspaces.length > 1 ? 'pointer' : 'default' }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 5, background: '#ff7a30', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "500 9px/1 'IBM Plex Mono',monospace", color: '#fff' }}>{name[0]?.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "500 12.5px/1.2 'Inter',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ font: "400 10px/1.3 'IBM Plex Mono',monospace", color: '#64686d' }}>GBP · Europe/London</div>
            </div>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true"><path d="M3 4 5 2l2 2M3 6l2 2 2-2"/></svg>
          </div>
        </div>

        {workspaceMenuOpen ? (
          <div role="menu" aria-label="Workspaces" style={{ position: 'absolute', top: 52, left: 14, right: 14, zIndex: 20, padding: 5, borderRadius: 9, background: '#fff', boxShadow: '0 14px 34px rgba(28,22,14,.18),inset 0 0 0 1px rgba(28,27,25,.1)' }}>
            {workspaces.map((workspace) => (
              <button key={workspace.id} type="button" role="menuitem" disabled={workspacePending} onClick={() => void switchWorkspace(workspace.id)} style={{ width: '100%', border: 0, padding: '8px 10px', borderRadius: 6, background: workspace.id === activeMerchantId ? '#f4f3f1' : 'transparent', color: '#40454a', font: "400 12px/1.3 'Inter',sans-serif", textAlign: 'left', cursor: 'pointer' }}>{workspace.name} · {workspace.role}</button>
            ))}
            {workspaceError ? <span role="alert" style={{ display: 'block', padding: '6px 10px', color: '#b0431a', font: "400 10px/1.4 'Inter',sans-serif" }}>{workspaceError}</span> : null}
          </div>
        ) : null}

        <div style={{ padding: '0 10px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: activeHref === '/overview' ? '#f4f3f1' : 'transparent', boxShadow: activeHref === '/overview' ? 'inset 0 0 0 1px rgba(28,27,25,.08)' : 'none' }}>
            <span style={{ color: activeHref === '/overview' ? '#1c1f23' : '#64686d', display: 'flex' }}><SidebarIcon name="overview"/></span>
            <AppNavLink href="/overview" aria-current={activeHref === '/overview' ? 'page' : undefined} style={{ flex: 1, font: `${activeHref === '/overview' ? 500 : 400} 13px/1 'Inter',sans-serif`, color: activeHref === '/overview' ? '#1c1f23' : '#40454a' }}>Overview</AppNavLink>
          </div>
        </div>
        <div style={{ height: 1, background: '#e4e3e0', margin: '2px 14px 12px' }}/>

        {groups.map((group) => (
          <Fragment key={group.label}>
            <div style={{ padding: '0 20px 7px', font: "400 11px/1 'Inter',sans-serif", color: '#64686d' }}>{group.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0 10px 14px', gap: 1 }}>
              {group.items.map((item) => {
                const active = item.href === activeHref;
                const count = item.key === 'work' ? workCount : item.key === 'claims' ? caseCount : undefined;
                return (
                  <div key={item.href} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, background: active ? '#f4f3f1' : 'transparent', boxShadow: active ? 'inset 0 0 0 1px rgba(28,27,25,.08)' : 'none' }}>
                    <span style={{ color: active ? '#1c1f23' : '#64686d', display: 'flex' }}><SidebarIcon name={SIDEBAR_ICONS[item.key as AppRouteKey]}/></span>
                    <AppNavLink href={item.href} aria-current={active ? 'page' : undefined} style={{ flex: 1, font: `${active ? 500 : 400} 13px/1 'Inter',sans-serif`, color: active ? '#1c1f23' : '#40454a' }}>{item.label}</AppNavLink>
                    {count != null && count > 0 ? <span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{formatNumber(count)}</span> : null}
                    {item.key === 'reconciliation' && reconciliationCount != null ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c98a1a' }}/><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{formatNumber(reconciliationCount)}</span></span> : null}
                    {item.key === 'integrations' ? <span aria-label={`Source health ${sourceTone}`} style={{ width: 5, height: 5, borderRadius: '50%', background: sourceTone === 'green' ? '#1a6b43' : sourceTone === 'red' ? '#b0431a' : '#c98a1a' }}/> : null}
                    {item.key === 'notifications' ? <span aria-label="Unread notifications" style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff7a30' }}/> : null}
                  </div>
                );
              })}
            </div>
          </Fragment>
        ))}

        <div style={{ flex: 1 }}/>
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{ borderRadius: 10, background: '#f4f3f1', padding: '11px 12px' }}>
            <div style={{ font: "400 10px/1 'IBM Plex Mono',monospace", letterSpacing: '.06em', color: '#64686d', marginBottom: 8 }}>ATTENTION</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ flex: 1, font: "500 11.5px/1 'Inter',sans-serif", color: '#1c1f23' }}>Selected sources</span><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{sourceTone === 'green' ? 'current' : sourceTone === 'red' ? 'unavailable' : 'attention'}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ flex: 1, font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>Import mapping</span><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>unavailable</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ flex: 1, font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>Returns layer</span><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>no source</span></div>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #e4e3e0', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 25, height: 25, borderRadius: '50%', background: '#f2f0ed', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.06)', font: "500 9.5px/25px 'IBM Plex Mono',monospace", textAlign: 'center', color: '#40454a' }}>{initials(userName)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AppNavLink href="/settings/workspace/team" style={{ display: 'block', font: "500 12px/1.25 'Inter',sans-serif", color: '#1c1f23', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName?.trim() || 'Account'}</AppNavLink>
            <div style={{ font: "400 10px/1.3 'IBM Plex Mono',monospace", color: '#64686d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userRole}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true"><circle cx="6" cy="2.6" r=".9"/><circle cx="6" cy="6" r=".9"/><circle cx="6" cy="9.4" r=".9"/></svg>
        </div>
      </div>
    </>
  );
}
