import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Users,
  HelpCircle,
  Settings,
  ShieldCheck,
  BarChart3,
  Store,
  FileWarning,
  GitBranch,
  Handshake,
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
  | 'store'
  | 'work'
  | 'customers'
  | 'claims'
  | 'losses'
  | 'recoveries'
  | 'partners'
  | 'watchlist'
  | 'evidencePackages'
  | 'reports'
  | 'integrations'
  | 'settings'
  | 'help'
  | 'global'
  | 'lookup'
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
    label: 'Overview',
    pageTitle: 'Overview',
    permission: PERMISSIONS.VIEW_DASHBOARD,
    icon: Home,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Payout exposure, recovery, and prevention metrics',
  },
  store: {
    key: 'store',
    href: '/store',
    label: 'Store overview',
    pageTitle: 'Store overview',
    permission: PERMISSIONS.VIEW_DASHBOARD,
    icon: Store,
    sidebar: false,
  },
  work: {
    key: 'work',
    href: '/work',
    label: 'Work',
    pageTitle: 'Work',
    permission: PERMISSIONS.VIEW_INBOX,
    icon: ListChecks,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Open tasks across payout cases, losses, and recoveries',
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
    workbench: true,
    commandPalette: true,
    commandDescription: 'Customer context for support payout decisions',
  },
  claims: {
    key: 'claims',
    href: '/claims',
    label: 'Payout Control',
    pageTitle: 'Payout Control',
    permission: PERMISSIONS.VIEW_INBOX,
    aliases: ['/inbox'],
    tier: 'pro',
    tierLabel: 'Payout Control',
    icon: FileWarning,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Control support payouts, evidence, and recovery cases',
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
    workbench: true,
    commandPalette: true,
    commandDescription: 'Canonical loss ledger: confirmed, estimated, recoverable, prevented, written off',
  },
  recoveries: {
    key: 'recoveries',
    href: '/recoveries',
    label: 'Recoveries',
    pageTitle: 'Recovery board',
    permission: PERMISSIONS.VIEW_INBOX,
    tier: 'pro',
    tierLabel: 'Recovery',
    icon: Repeat2,
    sidebar: true,
    workbench: true,
    commandPalette: true,
    commandDescription: 'Track source-backed losses, evidence gaps, correspondence, and synced recovery outcomes',
  },
  partners: {
    key: 'partners',
    href: '/partners',
    label: 'Partners',
    pageTitle: 'Partner Rulebook',
    permission: PERMISSIONS.VIEW_SETTINGS,
    tier: 'pro',
    tierLabel: 'Rules',
    icon: Handshake,
    sidebar: false,
    // Compatibility route for existing recovery configuration. Recovery parties
    // belong to the loss/recovery workflow, not a competing merchant module.
    workbench: false,
    commandPalette: false,
    commandDescription: 'Legacy recovery-partner configuration',
  },
  watchlist: {
    key: 'watchlist',
    href: '/watchlist',
    label: 'Customer context',
    pageTitle: 'Customer context',
    permission: PERMISSIONS.VIEW_WATCHLIST,
    tier: 'growth',
    tierLabel: 'Context',
    icon: GitBranch,
    sidebar: false,
    workbench: false,
    commandPalette: false,
    commandDescription: 'Legacy customer-context redirect',
  },
  evidencePackages: {
    key: 'evidencePackages',
    href: '/chargebacks',
    label: 'Evidence',
    pageTitle: 'Evidence packages',
    permission: PERMISSIONS.VIEW_CHARGEBACKS,
    tier: 'growth',
    tierLabel: 'Evidence',
    icon: ShieldCheck,
    sidebar: false,
    workbench: false,
    commandPalette: false,
    commandDescription: 'Dispute evidence packages (legacy)',
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
  integrations: {
    key: 'integrations',
    href: '/integrations',
    label: 'Integrations',
    pageTitle: 'Integrations',
    permission: PERMISSIONS.VIEW_SETTINGS,
    aliases: ['/settings/integrations'],
    icon: Plug,
    sidebar: true,
    workbench: false,
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
  global: {
    key: 'global',
    href: '/global',
    label: 'Pattern context',
    pageTitle: 'Pattern context',
    permission: PERMISSIONS.VIEW_CUSTOMERS,
    tier: 'growth',
    tierLabel: 'Legacy',
    icon: GitBranch,
    sidebar: false,
    workbench: false,
    commandPalette: false,
    commandDescription: 'Legacy imported pattern context',
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
    workbench: true,
    commandPalette: true,
    commandDescription: 'Configure merchant-owned payout and recovery rules',
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
    workbench: true,
    commandPalette: true,
    commandDescription: 'Configure bounded operational workflows and inspect runs',
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
    commandPalette: false,
    commandDescription: 'API-style customer lookup (redirects to search)',
  },
} satisfies Record<AppRouteKey, AppRoute>;

/** Command palette shortcuts that are not primary nav routes. */
export const COMMAND_PALETTE_FILTERS = [
  {
    label: 'Cases missing evidence',
    description: 'Open payout cases waiting on evidence',
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

export function getCommandPaletteNavItems(permissions?: ReadonlySet<Permission>) {
  const items: Array<{ label: string; description: string; href: string }> = [];
  for (const r of Object.values(APP_ROUTES) as AppRoute[]) {
    if (!r.commandPalette) continue;
    if (r.permission && permissions && !permissions.has(r.permission)) continue;
    items.push({
      label: r.key === 'dashboard' ? 'Payout overview' : r.label,
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
