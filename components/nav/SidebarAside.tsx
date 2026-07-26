'use client';

import Link from 'next/link';
import { ChevronRight, HelpCircle, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { SidebarGroupLabel, SidebarNavItem, type NavItemView } from '@/components/nav/SidebarNavItem';

type SidebarAsideProps = {
  isMobile: boolean;
  isCollapsed: boolean;
  merchantName: string | null;
  userEmail: string;
  shopifyConnected: boolean;
  helpdeskConnected: boolean;
  groups: Array<{ label: string; items: NavItemView[] }>;
  isActive: (href: string) => boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  onSignOut: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function SidebarAside({
  isMobile,
  isCollapsed,
  merchantName,
  userEmail,
  shopifyConnected,
  helpdeskConnected,
  groups,
  isActive,
  onCloseMobile,
  onToggleCollapse,
  onSignOut,
  onMouseEnter,
  onMouseLeave,
}: SidebarAsideProps) {
  return (
    <aside
      className={cn(
        'ua-app-sidebar relative flex h-full flex-shrink-0 flex-col',
        'border-r border-[var(--ua-border-default)]',
        isMobile
          ? 'w-72'
          : cn(
              'transition-[width] duration-[var(--ua-duration-slow)] ease-[var(--ua-ease-standard)]',
              'overflow-hidden',
              isCollapsed ? 'w-14' : 'w-60',
            ),
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn(
          'flex flex-shrink-0 border-b border-[var(--ua-border-default)] px-3',
          isCollapsed ? 'h-14 flex-col items-center justify-center gap-1 py-1.5' : 'flex-col gap-1.5 py-2',
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
            <UnauthLogo variant="mono-dark" size={isCollapsed ? 9 : 12} />
          </Link>
          {!isCollapsed && (
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={onToggleCollapse}
              className={cn(
                'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm',
                'text-[var(--ua-text-tertiary)] hover:text-[var(--ua-text-secondary)]',
                'transition-colors duration-[var(--ua-duration-fast)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
              )}
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
            </button>
          )}
        </div>

        {!isCollapsed && merchantName ? (
          <div className="flex min-h-8 w-full items-center gap-2 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)] px-2 py-1" title={merchantName}>
            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-[var(--ua-surface-selected)] text-[length:var(--ua-text-micro-size)] font-bold text-[var(--ua-text-primary)]">
              {merchantName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 truncate text-[length:var(--ua-text-micro-size)] font-semibold leading-tight text-[var(--ua-text-secondary)]">{merchantName}</span>
          </div>
        ) : null}

        {!isCollapsed && (!shopifyConnected || !helpdeskConnected) ? (
          <Link
            href="/integrations"
            prefetch={false}
            onClick={onCloseMobile}
            className="flex min-h-6 w-full items-center gap-1.5 rounded-[var(--ua-radius-control)] px-2 py-1 text-[length:var(--ua-text-micro-size)] font-medium leading-tight transition-colors duration-[var(--ua-duration-fast)] hover:bg-[var(--ua-surface-hover)]"
            /*
             * A neutral chip, not a tinted one. The warning dot carries the
             * state; washing the whole pill in 10% olive put a cream block in
             * the sidebar of every unconnected workspace, which is decoration
             * doing a glyph's job (§3.1).
             */
            style={{
              background: 'var(--ua-surface-primary)',
              color: 'var(--ua-text-secondary)',
              border: '1px solid var(--ua-border-default)',
            }}
            title="Connect your store and helpdesk to go live"
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: 'var(--ua-warning)' }}
              aria-hidden="true"
            />
            <span className="truncate">
              {!shopifyConnected && !helpdeskConnected
                ? 'Connect sources'
                : !helpdeskConnected
                  ? 'Helpdesk not connected'
                  : 'Store not connected'}
            </span>
          </Link>
        ) : null}

        {isCollapsed && merchantName ? (
          <div
            className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-[var(--ua-surface-selected)] text-[length:var(--ua-text-micro-size)] font-bold leading-none text-[var(--ua-text-primary)]"
            title={merchantName}
          >
            {merchantName
              .split(/\s+/)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
        ) : null}
      </div>

      <nav
        className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden', isCollapsed ? 'px-2 py-3' : 'p-2')}
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
          'flex flex-shrink-0 flex-col border-t border-[var(--ua-border-default)]',
          isCollapsed ? 'items-center gap-1 p-2' : 'gap-0.5 p-2',
        )}
      >
        {!isCollapsed ? (
          <div className="px-2 py-1 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)] truncate">
            {userEmail}
          </div>
        ) : null}

        <Link
          href="/help"
          prefetch={false}
          title={isCollapsed ? 'Help' : undefined}
          onClick={onCloseMobile}
          className={cn(
            'flex h-8 items-center gap-3 rounded-sm px-2',
            'text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)] hover:text-[var(--ua-text-primary)]',
            'transition-colors duration-[var(--ua-duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
            isCollapsed && 'justify-center',
          )}
        >
          <HelpCircle className="h-4 w-4 flex-shrink-0 text-[var(--ua-text-tertiary)]" aria-hidden="true" />
          {!isCollapsed && <span>Help</span>}
        </Link>

        <Link
          href="/settings"
          prefetch={false}
          title={isCollapsed ? 'Settings' : undefined}
          onClick={onCloseMobile}
          className={cn(
            'flex h-8 items-center gap-3 rounded-sm px-2',
            'text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)] hover:text-[var(--ua-text-primary)]',
            'transition-colors duration-[var(--ua-duration-fast)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
            isCollapsed && 'justify-center',
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0 text-[var(--ua-text-tertiary)]" aria-hidden="true" />
          {!isCollapsed && <span>Settings</span>}
        </Link>

        <button
          type="button"
          onClick={onSignOut}
          title={isCollapsed ? 'Sign out' : undefined}
          className={cn(
            'flex h-8 w-full items-center gap-3 rounded-sm px-2',
            'text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)] hover:text-[var(--ua-text-primary)]',
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
                className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)] transition-colors hover:text-[var(--ua-text-secondary)] hover:underline"
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
