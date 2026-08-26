'use client';

import { Bell, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Permission } from '@/lib/permissions';
import { useFetchJson } from '@/lib/react/useFetchJson';
import CommandPalette from './CommandPalette';
import { AuthenticatedSidebar } from '@/components/navigation/AuthenticatedSidebar';
import AppNavLink from '@/components/navigation/AppNavLink';
import shellStyles from './authenticatedDesignShell.module.css';
import type { WorkspaceOption } from './WorkspaceSwitcher';

type SourceTone = 'green' | 'amber' | 'red' | 'neutral';

type AuthenticatedDesignShellProps = {
  children: ReactNode;
  workspaceName: string | null;
  workspaces: WorkspaceOption[];
  activeMerchantId: string | null;
  userName: string | null;
  userEmail: string;
  userRole: string;
  permissions: Permission[];
  sourceTone: SourceTone;
  sourceLabel: string;
  workCount?: number;
};

function activeHref(pathname: string) {
  if (/^\/(orders|refunds|returns|shipments|tickets|disputes)\//.test(pathname)) {
    return '/cases';
  }

  const routes = [
    '/overview',
    '/work',
    '/cases',
    '/customers',
    '/financials/losses',
    '/financials/recovery',
    '/financials/reconciliation',
    '/financials/reports',
    '/controls/rules',
    '/controls/flows',
    '/sources/connected',
    '/sources/imports',
    '/notifications',
    '/help',
    '/settings/workspace/account',
  ];
  const matched = routes.find((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (matched) return matched;
  if (pathname.startsWith('/settings')) return '/settings/workspace/account';
  if (pathname.startsWith('/sources')) return '/sources/connected';
  if (pathname === '/controls' || pathname.startsWith('/controls/rules')) return '/controls/rules';
  if (pathname.startsWith('/controls/flows')) return '/controls/flows';
  if (pathname === '/financials') return '/financials/losses';
  return '';
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email.split('@')[0] || 'Account';
  const words = source.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2)).toUpperCase();
}

function AuthenticatedTopbar({
  workspaceName,
  userName,
  userEmail,
  permissions,
  sourceTone,
  sourceLabel,
}: Pick<AuthenticatedDesignShellProps, 'workspaceName' | 'userName' | 'userEmail' | 'permissions' | 'sourceTone' | 'sourceLabel'>) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data } = useFetchJson<{ unreadCount?: number }>('/api/notifications/unread-count', {
    blocksReadiness: false,
  });
  const unreadCount = data?.unreadCount ?? 0;
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <div className={shellStyles.topbar}>
        <button type="button" className={shellStyles.commandTrigger} onClick={openPalette} aria-label="Search and navigate">
          <Search size={13} aria-hidden="true" />
          <span>Search cases, customers, orders…</span>
          <kbd>⌘K</kbd>
        </button>
        <div className={shellStyles.topbarSpacer} />
        <AppNavLink href="/sources/connected" className={shellStyles.trustChip} aria-label="Open source health">
          <i data-tone={sourceTone} />
          {sourceLabel}
        </AppNavLink>
        <AppNavLink
          href="/notifications"
          className={shellStyles.headerIcon}
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          <Bell size={14} aria-hidden="true" />
          {unreadCount > 0 ? <span aria-hidden="true" /> : null}
        </AppNavLink>
        <AppNavLink href="/settings/workspace/account" className={shellStyles.headerAvatar} aria-label="Open account settings">
          {initials(userName, userEmail)}
        </AppNavLink>
      </div>
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        permissions={permissions}
        workspaceName={workspaceName}
      />
    </>
  );
}

export default function AuthenticatedDesignShell({
  children,
  workspaceName,
  workspaces,
  activeMerchantId,
  userName,
  userEmail,
  userRole,
  permissions,
  sourceTone,
  sourceLabel,
  workCount,
}: AuthenticatedDesignShellProps) {
  const pathname = usePathname();
  return (
    <>
      <div
        className={shellStyles.shell}
        data-reference-shell="true"
        data-unauth-ui="evidence-operations-v1"
      >
        <div className={shellStyles.frame}>
          <AuthenticatedSidebar
            activeHref={activeHref(pathname)}
            workspaceName={workspaceName}
            workspaces={workspaces}
            activeMerchantId={activeMerchantId}
            userName={userName}
            userRole={userRole}
            sourceTone={sourceTone}
            permissions={permissions}
            workCount={workCount}
          />
          <div className={shellStyles.workspace}>
            <AuthenticatedTopbar
              workspaceName={workspaceName}
              userName={userName}
              userEmail={userEmail}
              permissions={permissions}
              sourceTone={sourceTone}
              sourceLabel={sourceLabel}
            />
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
