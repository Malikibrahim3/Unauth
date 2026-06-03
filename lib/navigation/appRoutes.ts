import type { LucideIcon } from 'lucide-react';
import {
  Home,
  ListChecks,
  Upload,
  Users,
  Star,
  HelpCircle,
  Settings,
  ShieldCheck,
  BarChart3,
  Store,
  FileWarning,
  GitBranch,
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
  | 'upload'
  | 'history'
  | 'settings'
  | 'help'
  | 'global'
  | 'lookup';

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
    commandDescription: 'Matched customers, evidence, and audit activity',
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
    commandDescription: 'Review and action open customer claims',
    badgeKey: 'claims',
  },
  watchlist: {
    key: 'watchlist',
    href: '/watchlist',
    label: 'Legacy case watch',
    pageTitle: 'Legacy case watch',
    permission: PERMISSIONS.VIEW_WATCHLIST,
    tier: 'pro',
    icon: Star,
    sidebar: false,
    workbench: false,
    commandPalette: false,
    commandDescription: 'Legacy customer monitoring view',
  },
  evidencePackages: {
    key: 'evidencePackages',
    href: '/chargebacks',
    label: 'Evidence packages',
    pageTitle: 'Evidence packages',
    permission: PERMISSIONS.VIEW_CHARGEBACKS,
    tier: 'free',
    tierLabel: 'Evidence',
    icon: ShieldCheck,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Download chargeback evidence',
  },
  reports: {
    key: 'reports',
    href: '/reports',
    label: 'Reports',
    pageTitle: 'Reports',
    permission: PERMISSIONS.VIEW_AUDIT,
    tier: 'pro',
    icon: BarChart3,
    sidebar: true,
    workbench: true,
  },
  upload: {
    key: 'upload',
    href: '/upload',
    label: 'Historical import',
    pageTitle: 'Historical import',
    permission: PERMISSIONS.UPLOAD_CSV,
    icon: Upload,
    sidebar: true,
    commandPalette: true,
    commandDescription: 'Import a CSV for historical backfill',
  },
  history: {
    key: 'history',
    href: '/history',
    label: 'Import history',
    pageTitle: 'Import history',
    permission: PERMISSIONS.VIEW_HISTORY,
    icon: ListChecks,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Past audit runs and results',
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
    label: 'Network graph',
    pageTitle: 'Network graph',
    permission: PERMISSIONS.VIEW_CUSTOMERS,
    tier: 'growth',
    tierLabel: 'Network',
    icon: GitBranch,
    sidebar: true,
    workbench: false,
    commandPalette: true,
    commandDescription: 'Cross-merchant identity network view',
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
    label: 'High-confidence matches',
    description: 'Customers with elevated risk tier',
    href: '/customers?risk=high',
  },
  {
    label: 'New investigations',
    description: 'Customers with status: new',
    href: '/customers?risk=high&status=new',
  },
] as const;

export const SIDEBAR_NAV_GROUPS: Array<{ label: string; routeKeys: AppRouteKey[] }> = [
  { label: 'Workspace', routeKeys: ['dashboard'] },
  {
    label: 'Review',
    routeKeys: ['store', 'customers', 'claims', 'evidencePackages', 'reports'],
  },
  { label: 'Network', routeKeys: ['global'] },
  { label: 'Backfill', routeKeys: ['upload', 'history'] },
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
      key: r.key === 'evidencePackages' ? 'evidence' : r.key === 'history' ? 'audits' : r.key,
      label: r.key === 'history' ? 'Import history' : r.label,
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
      label: r.key === 'dashboard' ? 'Investigation dashboard' : r.label,
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
