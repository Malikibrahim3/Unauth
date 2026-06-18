import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Users,
  Star,
  HelpCircle,
  Settings,
  ShieldCheck,
  BarChart3,
  Store,
  FileWarning,
  GitBranch,
  SlidersHorizontal,
} from 'lucide-react';
import { PERMISSIONS, type Permission } from '@/lib/permissions';
import type { ProductTier } from '@/lib/product/tiers';
import { ROUTE_ALIASES } from './aliases';

export type AppRouteKey =
  | 'dashboard'
  | 'store'
  | 'customers'
  | 'claims'
  | 'watchlist'
  | 'evidencePackages'
  | 'reports'
  | 'settings'
  | 'help'
  | 'global'
  | 'lookup'
  | 'rules';

export type AppRoute = {
  key: AppRouteKey;
  href: string;
  label: string;
  pageTitle: string;
  permission?: Permission;
  aliases?: string[];
  icon?: LucideIcon;
  /** Included in primary sidebar navigation */
  sidebar?: boolean;
  /** Included in workbench sub-nav */
  workbench?: boolean;
  /** Included in command palette quick nav */
  commandPalette?: boolean;
  commandDescription?: string;
  badgeKey?: 'claims';
  /** Informational product tier badge (Phase 0 — does not gate navigation). */
  tier?: ProductTier;
  /** Short tier badge label override, e.g. "Evidence" or "Network". */
  tierLabel?: string;
  /** Planned capability — show "Future" on the tier badge. */
  future?: boolean;
};

export const APP_ROUTES = {
  dashboard: {
    key: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    pageTitle: 'Dashboard',
    permission: PERMISSIONS.VIEW_DASHBOARD,
    icon: Home,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Claim context, evidence, and decision activity',
  },
  store: {
    key: 'store',
    href: '/store',
    label: 'Store overview',
    pageTitle: 'Store overview',
    permission: PERMISSIONS.VIEW_DASHBOARD,
    icon: Store,
    sidebar: true,
  },
  customers: {
    key: 'customers',
    href: '/customers',
    label: 'Customers',
    pageTitle: 'Customer intelligence',
    permission: PERMISSIONS.VIEW_CUSTOMERS,
    tier: 'pro',
    tierLabel: 'Claim Confidence',
    icon: Users,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Browse and search customer profiles',
  },
  claims: {
    key: 'claims',
    href: '/claims',
    label: 'Claims',
    pageTitle: 'Claims',
    permission: PERMISSIONS.VIEW_INBOX,
    aliases: ['/inbox'],
    tier: 'pro',
    tierLabel: 'Claim Review',
    icon: FileWarning,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Review open customer claims with context',
    badgeKey: 'claims',
  },
  watchlist: {
    key: 'watchlist',
    href: '/watchlist',
    label: 'Network',
    pageTitle: 'Network',
    permission: PERMISSIONS.VIEW_WATCHLIST,
    tier: 'growth',
    tierLabel: 'Network',
    icon: GitBranch,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Cross-merchant network context',
  },
  evidencePackages: {
    key: 'evidencePackages',
    href: '/chargebacks',
    label: 'Evidence',
    pageTitle: 'Evidence',
    permission: PERMISSIONS.VIEW_CHARGEBACKS,
    tier: 'growth',
    tierLabel: 'Evidence',
    icon: ShieldCheck,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Evidence packages for dispute documentation',
  },
  reports: {
    key: 'reports',
    href: '/reports',
    label: 'Analytics',
    pageTitle: 'Analytics',
    permission: PERMISSIONS.VIEW_AUDIT,
    tier: 'pro',
    icon: BarChart3,
    sidebar: true,
    workbench: true,
  },
  settings: {
    key: 'settings',
    href: '/settings',
    label: 'Settings',
    pageTitle: 'Settings',
    permission: PERMISSIONS.VIEW_SETTINGS,
    icon: Settings,
    commandPalette: true,
    commandDescription: 'Account and team settings',
  },
  help: {
    key: 'help',
    href: '/help',
    label: 'Help',
    pageTitle: 'Help',
    icon: HelpCircle,
  },
  global: {
    key: 'global',
    href: '/global',
    label: 'Network intelligence',
    pageTitle: 'Network intelligence',
    permission: PERMISSIONS.VIEW_CUSTOMERS,
    tier: 'growth',
    tierLabel: 'Network',
    icon: GitBranch,
    sidebar: false,
    workbench: false,
    commandPalette: true,
    commandDescription: 'Cross-merchant identity network (Growth+)',
  },
  rules: {
    key: 'rules',
    href: '/rules',
    label: 'Risk Controls',
    pageTitle: 'Risk Controls',
    permission: PERMISSIONS.VIEW_SETTINGS,
    tier: 'pro',
    tierLabel: 'Rules',
    icon: SlidersHorizontal,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Configure merchant-owned rules for recommendations',
  },
  lookup: {
    key: 'lookup',
    href: '/lookup',
    label: 'Live lookup',
    pageTitle: 'Live lookup',
    permission: PERMISSIONS.VIEW_CUSTOMERS,
    tier: 'growth',
    icon: Users,
    sidebar: false,
    commandPalette: true,
    commandDescription: 'API-style customer lookup (redirects to search)',
  },
} satisfies Record<AppRouteKey, AppRoute>;

/** Command palette shortcuts that are not primary nav routes. */
export const COMMAND_PALETTE_FILTERS = [
  {
    label: 'High claim-rate customers',
    description: 'Customers with prior claim history for review',
    href: '/customers?risk=high',
  },
  {
    label: 'New for review',
    description: 'Customers flagged and not yet actioned',
    href: '/customers?risk=high&status=new',
  },
] as const;

export const SIDEBAR_NAV_GROUPS: Array<{ label: string; routeKeys: AppRouteKey[] }> = [
  { label: 'Overview', routeKeys: ['dashboard'] },
  { label: 'Operations', routeKeys: ['claims', 'customers', 'evidencePackages', 'watchlist', 'rules'] },
  { label: 'Analytics', routeKeys: ['reports'] },
];

export function getSidebarNavItems(): Array<{ label: string; items: AppRoute[] }> {
  return SIDEBAR_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.routeKeys.map((key) => APP_ROUTES[key] as AppRoute),
  }));
}

export function getWorkbenchNavItems() {
  const items: Array<{ key: string; label: string; href: string }> = [];
  for (const r of Object.values(APP_ROUTES) as AppRoute[]) {
    if (!r.workbench) continue;
    items.push({
      key: r.key === 'evidencePackages' ? 'evidence' : r.key,
      label: r.label,
      href: r.href,
    });
  }
  return items;
}

export function getCommandPaletteNavItems() {
  const items: Array<{ label: string; description: string; href: string }> = [];
  for (const r of Object.values(APP_ROUTES) as AppRoute[]) {
    if (!r.commandPalette) continue;
    items.push({
      label: r.key === 'dashboard' ? 'Claim overview' : r.label,
      description: r.commandDescription ?? r.label,
      href: r.href,
    });
  }
  return items;
}

export function getPageTitleForPath(pathname: string): string | undefined {
  const path = pathname.split('?')[0] ?? pathname;
  for (const route of Object.values(APP_ROUTES) as AppRoute[]) {
    if (path === route.href || path.startsWith(`${route.href}/`)) {
      return route.pageTitle;
    }
    for (const alias of route.aliases ?? []) {
      if (path === alias || path.startsWith(`${alias}/`)) {
        return route.pageTitle;
      }
    }
  }
  if (path in ROUTE_ALIASES) {
    return getPageTitleForPath(ROUTE_ALIASES[path]);
  }
  return undefined;
}

export function getAllCanonicalHrefs(): string[] {
  return (Object.values(APP_ROUTES) as AppRoute[]).map((r) => r.href);
}

export function getAllAliasHrefs(): string[] {
  const fromRoutes = (Object.values(APP_ROUTES) as AppRoute[]).flatMap((r) => r.aliases ?? []);
  return [...fromRoutes, ...Object.keys(ROUTE_ALIASES)];
}
