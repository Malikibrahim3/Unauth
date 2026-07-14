'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFetchJson } from '@/lib/react/useFetchJson';
import { cn } from '@/lib/utils';
import { getSidebarNavItems } from '@/lib/navigation/appRoutes';
import type { Permission } from '@/lib/permissions';
import { parseProductGateEnv } from '@/lib/product/envFlags';
import { SidebarAside } from '@/components/nav/SidebarAside';
import type { NavItemView } from '@/components/nav/SidebarNavItem';

export interface SidebarProps {
  merchantName: string | null;
  userEmail: string;
  claimsCount?: number;
  shopifyConnected?: boolean;
  helpdeskConnected?: boolean;
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
  userEmail,
  claimsCount: initialClaimsCount = 0,
  shopifyConnected = false,
  helpdeskConnected = false,
  permissions = [],
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);

  useEffect(() => {
    const stored = readCollapsedPreference();
    if (stored) setCollapsed(true);
  }, []);
  const { data: navCounts } = useFetchJson<{ claimsCount?: number }>(
    `/api/nav-counts?context=${encodeURIComponent(pathname)}`,
    {
      parse: async (response) => (response.ok ? response.json() : {}),
    },
  );
  const claimsCount = navCounts?.claimsCount ?? initialClaimsCount;

  function toggleCollapse() {
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
      badgeTitle: route.key === 'claims' ? 'Open payout cases for review' : undefined,
    })),
  }));

  const isActive = (href: string) => {
    if (href === '/store' && pathname.startsWith('/audit') && searchParams.get('source') === 'shopify') {
      return true;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isCollapsed = collapsed && !hoverExpanded;
  const closeMobile = () => setMobileOpen(false);

  const asideProps = {
    isCollapsed,
    merchantName,
    userEmail,
    shopifyConnected,
    helpdeskConnected,
    groups,
    isActive,
    onCloseMobile: closeMobile,
    onToggleCollapse: toggleCollapse,
    onSignOut: () => {
      void handleSignOut();
    },
    onMouseEnter: () => {
      if (collapsed) setHoverExpanded(true);
    },
    onMouseLeave: () => {
      if (collapsed) setHoverExpanded(false);
    },
  };

  return (
    <>
      <div className="hidden md:block h-full">
        <SidebarAside {...asideProps} isMobile={false} />
      </div>

      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
        className={cn(
          'md:hidden fixed top-3 left-3 z-50',
          'flex h-9 w-9 items-center justify-center rounded-md',
          'bg-[var(--surface)] border border-[var(--border-muted)]',
          'text-[var(--icon-muted)] hover:text-[var(--icon)]',
          'shadow-sm transition-colors',
        )}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {mobileOpen ? (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 h-full">
            <SidebarAside {...asideProps} isMobile />
          </div>
        </>
      ) : null}
    </>
  );
}

export function SidebarInner(props: SidebarProps) {
  return <SidebarInnerContent {...props} />;
}
