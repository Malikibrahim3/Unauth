'use client';

import Link from 'next/link';
import { ChevronRight, HelpCircle, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { SidebarGroupLabel, SidebarNavItem, type NavItemView } from '@/components/nav/SidebarNavItem';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { providerLabel } from '@/lib/ui/merchantCopy';
import { WorkspaceSwitcher, type WorkspaceOption } from '@/components/layout/WorkspaceSwitcher';

type SidebarAsideProps = {
  isMobile: boolean;
  isCollapsed: boolean;
  merchantName: string | null;
  userName?: string | null;
  userEmail: string;
  connectionState: Pick<ConnectionState, 'orderSourceConnected' | 'helpdesk' | 'helpdeskProvider'>;
  workspaces: WorkspaceOption[];
  activeMerchantId: string | null;
  groups: Array<{ label: string; items: NavItemView[] }>;
  isActive: (href: string) => boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  onSignOut: () => void;
};

export function SidebarAside({
  isMobile,
  isCollapsed,
  merchantName,
  userName,
  userEmail,
  connectionState,
  workspaces,
  activeMerchantId,
  groups,
  isActive,
  onCloseMobile,
  onToggleCollapse,
  onSignOut,
}: SidebarAsideProps) {
  const allSourcesConnected =
    connectionState.orderSourceConnected && connectionState.helpdesk;
  const oneSourceConnected =
    connectionState.orderSourceConnected || connectionState.helpdesk;
  const sourceHealthText = allSourcesConnected
    ? 'Sources connected'
    : oneSourceConnected
      ? '1 source needs attention'
      : 'Connect sources';
  const sourceHealthAriaLabel = allSourcesConnected
    ? 'Sources connected. Review integrations.'
    : oneSourceConnected
      ? 'One source needs attention. Review integrations.'
      : 'Sources not connected. Review integrations.';

  return (
    <aside
      className={cn(
        'ua-app-sidebar relative flex h-full flex-shrink-0 flex-col',
        'border-r border-[var(--ua-border-subtle)]',
        isMobile
          ? 'w-72'
          : cn(
              'transition-[width] duration-[var(--ua-duration-slow)] ease-[var(--ua-ease-standard)]',
              'overflow-hidden',
            ),
      )}
      data-collapsed={!isMobile && isCollapsed ? 'true' : 'false'}
    >
      <div
        className={cn(
          'flex flex-shrink-0 px-3',
          isCollapsed ? 'h-[68px] flex-col items-center justify-center gap-1 py-2' : 'flex-col gap-2.5 pb-3 pt-4',
        )}
      >
        <div className="flex w-full min-w-0 items-center justify-between gap-2">
          <Link
            href="/dashboard"
            prefetch={false}
            className="flex min-w-0 flex-shrink-0 items-center gap-2 py-0.5"
            title="Unauth"
            onClick={onCloseMobile}
          >
            <UnauthLogo
              kind={isCollapsed ? 'symbol' : 'lockup'}
              tone="auto"
              height={isCollapsed ? 20 : 18}
              priority
              alt=""
              decorative
            />
          </Link>
          {!isCollapsed && (
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={onToggleCollapse}
              className={cn(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[var(--ua-radius-control)]',
                'text-[var(--ua-text-tertiary)] hover:text-[var(--ua-text-secondary)]',
                'hover:bg-[var(--ua-surface-hover)]',
                'transition-colors duration-[var(--ua-duration-fast)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
              )}
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
            </button>
          )}
        </div>

        {!isCollapsed && workspaces.length > 1 ? (
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeMerchantId={activeMerchantId}
          />
        ) : !isCollapsed && merchantName ? (
          <div className="flex min-h-9 w-full items-center gap-2 rounded-[var(--ua-radius-control)] bg-[var(--ua-surface-hover)] px-2.5 py-1.5" title={merchantName}>
            <span className="ua-text-working-title flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)] text-[var(--ua-text-primary)]">
              {merchantName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <span className="ua-text-label min-w-0 truncate leading-tight text-[var(--ua-text-secondary)]">{merchantName}</span>
          </div>
        ) : null}

        {!isCollapsed ? (
          <Link
            href="/integrations"
            prefetch={false}
            onClick={onCloseMobile}
            className="flex min-h-7 w-full items-center gap-2 rounded-[var(--ua-radius-control)] px-2.5 py-1 text-[length:var(--ua-text-metadata-size)] font-medium leading-tight text-[var(--ua-text-secondary)] transition-colors duration-[var(--ua-duration-fast)] hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)]"
            title={
              allSourcesConnected
                ? `${connectionState.helpdeskProvider ? providerLabel(connectionState.helpdeskProvider) : 'Helpdesk'} and commerce sources are connected. Review integrations.`
                : oneSourceConnected
                  ? 'One required source still needs attention. Review integrations.'
                  : 'Store and helpdesk are not connected. Review integrations to connect both sources.'
            }
            aria-label={sourceHealthAriaLabel}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{
                background: allSourcesConnected ? 'var(--ua-success)' : 'var(--ua-warning)',
              }}
              aria-hidden="true"
            />
            <span className="truncate">{sourceHealthText}</span>
          </Link>
        ) : null}

        {isCollapsed && merchantName ? (
          <Link
            href="/integrations"
            prefetch={false}
            onClick={onCloseMobile}
            className="relative flex h-[22px] w-[22px] items-center justify-center rounded-md bg-[var(--ua-surface-selected)] text-[length:var(--ua-text-metadata-size)] font-bold leading-none text-[var(--ua-text-primary)]"
            title={`${merchantName}. ${sourceHealthText}.`}
            aria-label={`${merchantName}. ${sourceHealthAriaLabel}`}
          >
            {merchantName
              .split(/\s+/)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--ua-shell)]"
              style={{ background: allSourcesConnected ? 'var(--ua-success)' : 'var(--ua-warning)' }}
              aria-hidden="true"
            />
          </Link>
        ) : null}
      </div>

      <nav
        className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden', isCollapsed ? 'px-2 py-2' : 'px-2.5 py-1')}
        aria-label="Main navigation"
      >
        {groups.map((group) => (
          <div key={group.label}>
            <SidebarGroupLabel label={group.label} collapsed={isCollapsed} />
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  collapsed={isCollapsed}
                  active={isActive(item.href)}
                  onNavigate={isMobile ? onCloseMobile : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          'flex flex-shrink-0 flex-col border-t border-[var(--ua-border-subtle)]',
          isCollapsed ? 'items-center gap-1 p-2.5' : 'gap-0.5 p-2.5',
        )}
      >
        {!isCollapsed ? (
          <div className="px-2 py-1 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)] truncate">
            <span className="block truncate" title={userName ?? userEmail}>
              {userName ?? 'Workspace operator'}
            </span>
          </div>
        ) : null}

        <Link
          href="/help"
          prefetch={false}
          title={isCollapsed ? 'Help' : undefined}
          onClick={onCloseMobile}
          className={cn(
            'flex h-8 items-center gap-3 rounded-[var(--ua-radius-control)] px-2',
            'text-[length:var(--ua-text-dense-size)] text-[var(--ua-text-secondary)] hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)]',
            'transition-colors duration-[var(--ua-duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
            isCollapsed && 'justify-center',
          )}
        >
          <HelpCircle className="h-4 w-4 flex-shrink-0 text-[var(--ua-text-tertiary)]" aria-hidden="true" />
          {!isCollapsed && <span>Help</span>}
        </Link>

        <button
          type="button"
          onClick={onSignOut}
          title={isCollapsed ? 'Sign out' : undefined}
          className={cn(
            'flex h-8 w-full items-center gap-3 rounded-[var(--ua-radius-control)] px-2',
            'text-[length:var(--ua-text-dense-size)] text-[var(--ua-text-secondary)] hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)]',
            'transition-colors duration-[var(--ua-duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
            isCollapsed && 'justify-center',
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0 text-[var(--ua-text-tertiary)]" aria-hidden="true" />
          {!isCollapsed && <span>Sign out</span>}
        </button>

        {!isCollapsed ? (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 px-2 pb-1">
            {[
              { href: '/legal/privacy', label: 'Privacy' },
              { href: '/legal/data-handling', label: 'Data handling' },
              { href: '/legal/dpa', label: 'DPA' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)] transition-colors hover:text-[var(--ua-text-secondary)] hover:underline"
              >
                {label}
              </Link>
            ))}
          </div>
        ) : null}

        {isCollapsed ? (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={onToggleCollapse}
            className={cn(
              'mt-1 flex h-7 w-7 items-center justify-center rounded-sm',
              'text-[var(--ua-text-tertiary)] hover:text-[var(--ua-text-secondary)]',
              'transition-colors duration-[var(--ua-duration-fast)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
            )}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </aside>
  );
}
