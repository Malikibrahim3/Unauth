'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFetchJson } from '@/lib/react/useFetchJson';
import { cn } from '@/lib/utils';
import { getSidebarNavItems } from '@/lib/navigation/appRoutes';
import type { Permission } from '@/lib/permissions';
import { parseProductGateEnv } from '@/lib/product/envFlags';
import { SidebarAside } from '@/components/nav/SidebarAside';
import type { NavItemView } from '@/components/nav/SidebarNavItem';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { WorkspaceOption } from '@/components/layout/WorkspaceSwitcher';

export interface SidebarProps {
  merchantName: string | null;
  userName?: string | null;
  userEmail: string;
  claimsCount?: number;
  connectionState?: Pick<ConnectionState, 'orderSourceConnected' | 'helpdesk' | 'helpdeskProvider'>;
  workspaces?: WorkspaceOption[];
  activeMerchantId?: string | null;
  permissions?: Permission[];
}

const STORAGE_KEY = 'unauth.sidebar.collapsed';

function readCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function SidebarInnerContent({
  merchantName,
  userName,
  userEmail,
  claimsCount: initialClaimsCount = 0,
  connectionState = {
    orderSourceConnected: false,
    helpdesk: false,
    helpdeskProvider: null,
  },
  workspaces = [],
  activeMerchantId = null,
  permissions = [],
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compactExpanded, setCompactExpanded] = useState(false);
  const [compactDesktop, setCompactDesktop] = useState(false);

  useEffect(() => {
    const stored = readCollapsedPreference();
    if (stored) setCollapsed(true);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px) and (max-width: 1199px)');
    const sync = () => {
      setCompactDesktop(query.matches);
      if (!query.matches) setCompactExpanded(false);
    };
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    setCompactExpanded(false);
  }, [pathname]);
  const { data: navCounts } = useFetchJson<{ claimsCount?: number }>(
    `/api/nav-counts?context=${encodeURIComponent(pathname)}`,
    {
      parse: async (response) => (response.ok ? response.json() : {}),
    },
  );
  const claimsCount = navCounts?.claimsCount ?? initialClaimsCount;

  function toggleCollapse() {
    if (compactDesktop) {
      setCompactExpanded((current) => !current);
      return;
    }

    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* Storage may be unavailable in privacy-restricted browsers. */
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const enforceGates = parseProductGateEnv(process.env.NEXT_PUBLIC_ENFORCE_PRODUCT_GATES);
  const groups = getSidebarNavItems(new Set(permissions)).map((group) => ({
    label: group.label,
    items: group.items.map((route): NavItemView => ({
      href: route.href,
      label: route.label,
      icon: route.icon,
      tier: route.tier,
      tierLabel: route.tierLabel,
      tierFuture: route.future,
      showDevAccess: !enforceGates && Boolean(route.tier),
      badge: route.key === 'claims' ? claimsCount || undefined : undefined,
      badgeTitle: route.key === 'claims' ? 'Cases requiring review · active statuses' : undefined,
    })),
  }));

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const desktopCompact = collapsed || compactDesktop;
  const isCollapsed = desktopCompact && !compactExpanded;
  const closeMobile = () => setMobileOpen(false);

  const asideProps = {
    isCollapsed,
    merchantName:
      merchantName ??
      workspaces.find((workspace) => workspace.id === activeMerchantId)?.name ??
      null,
    userName,
    userEmail,
    connectionState,
    workspaces,
    activeMerchantId,
    groups,
    isActive,
    onCloseMobile: closeMobile,
    onToggleCollapse: toggleCollapse,
    onSignOut: () => {
      void handleSignOut();
    },
  };

  return (
    <>
      <div
        className={cn(
          'relative hidden h-full shrink-0 md:block',
          collapsed
            ? 'w-[var(--ua-sidebar-width-collapsed)]'
            : 'w-[var(--ua-sidebar-width-collapsed)] min-[1200px]:w-[var(--ua-sidebar-width)]',
        )}
      >
        <div
          className={cn(
            'absolute inset-y-0 left-0 h-full',
            desktopCompact && compactExpanded && 'z-[var(--ua-z-dropdown)]',
          )}
          style={desktopCompact && compactExpanded ? { boxShadow: 'var(--ua-shadow-menu)' } : undefined}
        >
          <SidebarAside {...asideProps} isMobile={false} />
        </div>
      </div>

      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
        className={cn(
          'md:hidden fixed top-3 left-3 z-50',
          'flex h-9 w-9 items-center justify-center rounded-md',
          'bg-[var(--ua-surface-primary)] border border-[var(--ua-border-subtle)]',
          'text-[var(--ua-icon-secondary)] hover:text-[var(--ua-icon-primary)]',
          'transition-colors',
        )}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {mobileOpen ? (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-[var(--ua-backdrop)]"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 h-full">
            <SidebarAside {...asideProps} isCollapsed={false} isMobile />
          </div>
        </>
      ) : null}
    </>
  );
}

export function SidebarInner(props: SidebarProps) {
  return <SidebarInnerContent {...props} />;
}
