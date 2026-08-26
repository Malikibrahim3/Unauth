'use client';

import { useState, type RefObject } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HelpCircle, Bell, MoreHorizontal } from 'lucide-react';
import type { Permission } from '@/lib/permissions';
import { getSidebarNavItems, type AppRouteKey } from '@/lib/navigation/appRoutes';
import { formatNumber } from '@/lib/utils/format';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { DURATION } from '@/lib/design/motion';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import AppNavLink from './AppNavLink';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import styles from '@/components/layout/authenticatedDesignShell.module.css';
import { WorkspaceSwitcher, type WorkspaceOption } from '@/components/layout/WorkspaceSwitcher';

type SidebarIconName =
  | 'overview'
  | 'work'
  | 'cases'
  | 'customers'
  | 'loss'
  | 'recovery'
  | 'reconciliation'
  | 'reports'
  | 'rules'
  | 'flows'
  | 'connected'
  | 'imports'
  | 'settings'
  | 'notifications'
  | 'help';

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

function SidebarIcon({ name }: { name: SidebarIconName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (name === 'overview') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><rect x="0.5" y="0.5" width="5" height="5" rx="1.5" {...common} /><rect x="7.5" y="0.5" width="5" height="5" rx="1.5" {...common} /><rect x="0.5" y="7.5" width="5" height="5" rx="1.5" {...common} /><rect x="7.5" y="7.5" width="5" height="5" rx="1.5" {...common} /></svg>;
  if (name === 'work') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><rect x="0.5" y="1.5" width="12" height="10" rx="2" {...common} /><line x1="0.5" y1="5" x2="12.5" y2="5" {...common} /></svg>;
  if (name === 'cases') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><rect x="1.5" y="0.5" width="10" height="12" rx="2" {...common} /><line x1="4" y1="4" x2="9" y2="4" {...common} /><line x1="4" y1="7" x2="9" y2="7" {...common} /></svg>;
  if (name === 'customers') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><circle cx="6.5" cy="4" r="2.6" {...common} /><path d="M1.6 12c0-2.7 2.2-4.2 4.9-4.2s4.9 1.5 4.9 4.2" {...common} /></svg>;
  if (name === 'loss') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><rect x="0.5" y="8" width="3" height="4.5" rx="1" {...common} /><rect x="5" y="5" width="3" height="7.5" rx="1" {...common} /><rect x="9.5" y="1.5" width="3" height="11" rx="1" {...common} /></svg>;
  if (name === 'recovery') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5.5" {...common} /><path d="M6.5 3.5v6M4.5 5.5h4" {...common} /></svg>;
  if (name === 'reconciliation') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><path d="M1.5 3.5h10M1.5 9.5h10" {...common} /><circle cx="4.5" cy="3.5" r="1.6" {...common} /><circle cx="8.5" cy="9.5" r="1.6" {...common} /></svg>;
  if (name === 'reports') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><rect x="2" y="0.5" width="9" height="12" rx="2" {...common} /><line x1="4.5" y1="4" x2="8.5" y2="4" {...common} /><line x1="4.5" y1="7" x2="8.5" y2="7" {...common} /></svg>;
  if (name === 'rules') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="2.2" {...common} /><circle cx="6.5" cy="6.5" r="5.5" {...common} strokeDasharray="2 2.4" /></svg>;
  if (name === 'flows') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><rect x="0.5" y="1" width="4" height="4" rx="1.2" {...common} /><rect x="8.5" y="8" width="4" height="4" rx="1.2" {...common} /><path d="M4.5 3h3.5v7h.5" {...common} /></svg>;
  if (name === 'connected') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><rect x="0.5" y="2" width="12" height="4" rx="1.4" {...common} /><rect x="0.5" y="7.5" width="12" height="4" rx="1.4" {...common} /></svg>;
  if (name === 'imports') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><path d="M6.5 9V1.5M3.6 4.4L6.5 1.5l2.9 2.9" {...common} /><path d="M1.5 10.5h10" {...common} /></svg>;
  if (name === 'settings') return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><line x1="1" y1="4" x2="12" y2="4" {...common} /><line x1="1" y1="9" x2="12" y2="9" {...common} /><circle cx="8.6" cy="4" r="1.9" {...common} /><circle cx="4.4" cy="9" r="1.9" {...common} /></svg>;
  if (name === 'notifications') return <Bell size={13} aria-hidden="true" strokeWidth={1.2} />;
  return <HelpCircle size={13} aria-hidden="true" strokeWidth={1.2} />;
}

function initials(value: string | null | undefined): string {
  const words = (value ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'NA';
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
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
  const groups = getSidebarNavItems(permissions ? new Set(permissions) : undefined);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { mounted, phase, containerRef, motionAllowed } = useOverlayPresence({
    open: accountMenuOpen,
    onClose: () => setAccountMenuOpen(false),
    exitDurationMs: DURATION.fast,
    closeOnOutsideClick: true,
    restoreFocus: true,
    transient: true,
  });
  const accountMenuVisible = phase === 'open';

  async function handleSignOut() {
    setAccountMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className={styles.sidebar} aria-label="Workspace navigation">
      <div className={styles.brand}>
        <div className={styles.brandLink}>
          <AppNavLink href="/overview" aria-label="Unauth overview" active={activeHref === '/overview'}>
          <UnauthLogo kind="symbol" tone="auto" height={26} alt="" decorative className={styles.brandMark} />
          </AppNavLink>
          <span className={styles.brandText}>
            <strong>Unauth</strong>
            <WorkspaceSwitcher
              workspaces={workspaces}
              activeMerchantId={activeMerchantId}
              fallbackName={workspaceName}
            />
          </span>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Main navigation">
        {groups.map((group) => (
          <div className={styles.navGroup} key={group.label}>
            <div className={styles.navGroupLabel}>{group.label}</div>
            {group.items.map((item) => {
              const active = item.href === activeHref;
              const count = item.key === 'work' ? workCount : item.key === 'claims' ? caseCount : item.key === 'reconciliation' ? reconciliationCount : undefined;
              const countTone = item.key === 'work' ? 'red' : item.key === 'reconciliation' ? 'amber' : 'neutral';
              return (
                <AppNavLink
                  href={item.href}
                  className={styles.navItem}
                  data-active={active ? 'true' : undefined}
                  key={item.href}
                  active={active}
                  aria-current={active ? 'page' : undefined}
                >
                  <SidebarIcon name={SIDEBAR_ICONS[item.key as keyof typeof SIDEBAR_ICONS]} />
                  <span>{item.label}</span>
                  {count != null && count > 0 ? <small data-tone={countTone}>{formatNumber(count)}</small> : null}
                  {item.key === 'integrations' ? <i className={styles.statusDot} data-tone={sourceTone} /> : null}
                </AppNavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <footer className={styles.footer}>
        <div className={styles.account}>
          <div className={styles.accountAvatar}>{initials(userName)}</div>
          <div className={styles.accountCopy}><strong>{userName?.trim() || 'Account'}</strong><small>{userRole}</small></div>
        </div>
        <div ref={containerRef as RefObject<HTMLDivElement>} className={cn('relative', styles.accountMenuWrap)}>
          <button
            type="button"
            className={styles.accountMenu}
            aria-label="Open account menu"
            aria-haspopup="true"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen((value) => !value)}
          >
            <MoreHorizontal size={14} aria-hidden="true" />
          </button>

          {mounted && (
            <div
              role="menu"
              aria-hidden={phase === 'exiting' ? true : undefined}
              className={cn(
                'absolute bottom-full right-0 z-50 mb-1',
                'w-44 rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)]',
                'bg-[var(--uo-route-surface-primary)] shadow-[var(--uo-route-shadow-menu)] py-1',
              )}
              style={{
                opacity: accountMenuVisible ? 1 : 0,
                transform: `translateY(${accountMenuVisible ? 0 : 2}px)`,
                transition: motionAllowed ? `opacity ${DURATION.fast}ms var(--uo-route-ease-standard), transform ${DURATION.fast}ms var(--uo-route-ease-standard)` : 'none',
                pointerEvents: phase === 'exiting' ? 'none' : undefined,
              }}
            >
              <Link
                href="/settings/workspace/account"
                role="menuitem"
                onClick={() => setAccountMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-body-sm text-[var(--uo-route-text-primary)] hover:bg-[var(--uo-route-surface-secondary)] transition-colors duration-[var(--uo-route-duration-fast)]"
              >
                Account settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-2 px-3 py-2 text-body-sm text-[var(--uo-route-risk-critical)] hover:bg-[var(--uo-route-surface-secondary)] transition-colors duration-[var(--uo-route-duration-fast)]"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </footer>
    </aside>
  );
}
