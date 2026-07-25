import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Users,
  HelpCircle,
  Settings,
  BarChart3,
  FileWarning,
  GitBranch,
  Repeat2,
  SlidersHorizontal,
  ListChecks,
  TrendingDown,
  Plug,
} from 'lucide-react';
import { PERMISSIONS, type Permission } from '@/lib/permissions';
import type { ProductTier } from '@/lib/product/tiers';
import { ROUTE_ALIASES } from './aliases';

export type AppRouteKey =
  | 'dashboard'
  | 'work'
  | 'customers'
  | 'claims'
  | 'losses'
  | 'recoveries'
  | 'reports'
  | 'integrations'
  | 'settings'
  | 'help'
  | 'rules'
  | 'flows';

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
    label: 'Overview',
    pageTitle: 'Overview',
    permission: PERMISSIONS.VIEW_DASHBOARD,
    icon: Home,
    sidebar: true,
    commandPalette: true,
    commandDescription: 'Customer concessions, reconciled recovery, and net unrecovered loss',
  },
  work: {
    key: 'work',
    href: '/work',
    label: 'Work',
    pageTitle: 'Work',
    permission: PERMISSIONS.VIEW_INBOX,
    icon: ListChecks,
    sidebar: true,
    commandPalette: true,
    commandDescription: 'Open tasks across cases, evidence, outcomes, and recoveries',
  },
  customers: {
    key: 'customers',
    href: '/customers',
    label: 'Customers',
    pageTitle: 'Customers',
    permission: PERMISSIONS.VIEW_CUSTOMERS,
    tier: 'pro',
    tierLabel: 'Context',
    icon: Users,
    sidebar: true,
    commandPalette: true,
    commandDescription: 'Customer context for case reconciliation',
  },
  claims: {
    key: 'claims',
    href: '/claims',
    label: 'Cases',
    pageTitle: 'Case reconciliation',
    permission: PERMISSIONS.VIEW_INBOX,
    aliases: ['/inbox'],
    tier: 'pro',
    tierLabel: 'Cases',
    icon: FileWarning,
    sidebar: true,
    commandPalette: true,
    commandDescription: 'Reconcile claims, evidence, customer actions, responsibility, and recovery work',
    badgeKey: 'claims',
  },
  losses: {
    key: 'losses',
    href: '/losses',
    label: 'Losses',
    pageTitle: 'Losses',
    permission: PERMISSIONS.VIEW_INBOX,
    tier: 'pro',
    tierLabel: 'Losses',
    icon: TrendingDown,
    sidebar: true,
    commandPalette: true,
    commandDescription: 'Canonical loss ledger: confirmed, estimated, recoverable, prevented, written off',
  },
  recoveries: {
    key: 'recoveries',
    href: '/recoveries',
    label: 'Recovery',
    pageTitle: 'Recovery board',
    permission: PERMISSIONS.VIEW_INBOX,
    tier: 'pro',
    tierLabel: 'Recovery',
    icon: Repeat2,
    sidebar: true,
    commandPalette: true,
    commandDescription: 'Track source-backed losses, evidence gaps, correspondence, and synced recovery outcomes',
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
  },
  integrations: {
    key: 'integrations',
    href: '/integrations',
    label: 'Integrations',
    pageTitle: 'Integrations',
    permission: PERMISSIONS.VIEW_SETTINGS,
    aliases: ['/settings/integrations'],
    icon: Plug,
    sidebar: true,
    commandPalette: true,
    commandDescription: 'Connect commerce, helpdesk, carrier, and payment sources',
  },
  settings: {
    key: 'settings',
    href: '/settings',
    label: 'Settings',
    pageTitle: 'Settings',
    permission: PERMISSIONS.VIEW_SETTINGS,
    icon: Settings,
    sidebar: true,
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
  rules: {
    key: 'rules',
    href: '/rules',
    label: 'Rules',
    pageTitle: 'Rules',
    permission: PERMISSIONS.VIEW_SETTINGS,
    tier: 'pro',
    tierLabel: 'Rules',
    icon: SlidersHorizontal,
    sidebar: true,
    commandPalette: true,
    commandDescription: 'Configure merchant-owned customer and recovery rules',
  },
  flows: {
    key: 'flows',
    href: '/flows',
    label: 'Flows',
    pageTitle: 'Flows',
    permission: PERMISSIONS.VIEW_SETTINGS,
    tier: 'pro',
    tierLabel: 'Flows',
    icon: GitBranch,
    sidebar: true,
    commandPalette: true,
    commandDescription: 'Configure bounded operational workflows and inspect runs',
  },
} satisfies Record<AppRouteKey, AppRoute>;

/** Command palette shortcuts that are not primary nav routes. */
export const COMMAND_PALETTE_FILTERS = [
  {
    label: 'Cases missing evidence',
    description: 'Open cases waiting on evidence',
    href: '/claims?queue=evidence',
  },
  {
    label: 'Recovery cases needing correspondence',
    description: 'Source-backed cases waiting on generated external clarification',
    href: '/recoveries',
  },
] as const;

export const SIDEBAR_NAV_GROUPS: Array<{ label: string; routeKeys: AppRouteKey[] }> = [
  { label: 'Overview', routeKeys: ['dashboard'] },
  { label: 'Work', routeKeys: ['work', 'claims', 'losses', 'recoveries', 'customers'] },
  { label: 'Configure', routeKeys: ['rules', 'flows'] },
  { label: 'Reports and setup', routeKeys: ['reports', 'integrations', 'settings'] },
];

export function getSidebarNavItems(permissions?: ReadonlySet<Permission>): Array<{ label: string; items: AppRoute[] }> {
  return SIDEBAR_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.routeKeys
      .map((key) => APP_ROUTES[key] as AppRoute)
      .filter((route) => !route.permission || !permissions || permissions.has(route.permission)),
  })).filter((group) => group.items.length > 0);
}

export function getCommandPaletteNavItems(permissions?: ReadonlySet<Permission>) {
  const items: Array<{ label: string; description: string; href: string }> = [];
  for (const r of Object.values(APP_ROUTES) as AppRoute[]) {
    if (!r.commandPalette) continue;
    if (r.permission && permissions && !permissions.has(r.permission)) continue;
    items.push({
      label: r.key === 'dashboard' ? 'Operations overview' : r.label,
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
