'use client';

import {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link, { useLinkStatus } from 'next/link';
import { authenticatedSourceForPath } from '@/components/visual-authority/generated/AuthenticatedShellSources';
import CommandPaletteSource from '@/components/visual-authority/generated/Command-Palette-Clean';
import { safeInternalReturn } from '@/components/relationships/ConnectedObjectDetail';
import type { Permission } from '@/lib/permissions';
import { surfaceManifest } from '@/lib/surfaces/manifest';
import { formatNumber } from '@/lib/utils/format';
import { APP_ROUTES, getCommandPaletteNavItems, isAppRouteActive } from '@/lib/navigation/appRoutes';
import { parseReportRange } from '@/lib/reporting/intelligence';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';
import { AvatarMenu } from './AvatarMenu';
import { useBreadcrumbOverride, useBreadcrumbDetailOverride, useBreadcrumbParentOverride } from './BreadcrumbOverrideContext';
import type { WorkspaceOption } from './WorkspaceSwitcher';

type Props = {
  children: ReactNode;
  pathname: string;
  workspaceName: string | null;
  reportingCurrency?: string | null;
  timezone?: string | null;
  workspaces: WorkspaceOption[];
  activeMerchantId: string | null;
  userName: string | null;
  userEmail?: string;
  userRole: string;
  permissions: Permission[];
  sourceTone: 'green' | 'amber' | 'red' | 'neutral';
  sourceLabel: string;
  screenshotMode?: boolean;
  workCount?: number;
  caseCount?: number;
  reconciliationCount?: number;
  sourcePageOverride?: () => ReactElement;
  acceptanceScenarioId?: string | null;
};

type PaletteResult = {
  id: string;
  type: string;
  label: string;
  sublabel?: string | null;
  href: string;
  source: string;
};

const compactDeskQuery = '(max-width: 1280px)';
const railRoutes = ['/overview', '/financials/reports', '/cases', '/sources/imports', '/controls/flows'] as const;
const routeHeadings: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/overview$/, 'Operating position'],
  [/^\/search$/, 'Search'],
  [/^\/work$/, 'Work'],
  [/^\/cases\/[^/]+$/, 'Case review'],
  [/^\/cases$/, 'Cases'],
  [/^\/customers\/[^/]+\/evidence\/new$/, 'Evidence package'],
  [/^\/customers\/[^/]+$/, 'Customer'],
  [/^\/customers$/, 'Customers'],
  [/^\/(?:orders|refunds|returns|shipments|tickets|disputes)\/[^/]+$/, 'Connected record'],
  [/^\/financials\/losses(?:\/|$)/, 'Loss ledger'],
  [/^\/financials\/recovery(?:\/|$)/, 'Recovery board'],
  [/^\/financials\/reconciliation$/, 'Reconciliation'],
  [/^\/financials\/reports(?:\/|$)/, 'Reports'],
  [/^\/controls\/rules\/recovery$/, 'Recovery rulebook'],
  [/^\/controls\/rules(?:\/|$)/, 'Payout rules'],
  [/^\/controls\/flows\/runs\/[^/]+$/, 'Flow run'],
  [/^\/controls\/flows\/runs$/, 'Flow runs'],
  [/^\/controls\/flows(?:\/|$)/, 'Flows'],
  [/^\/sources\/imports\/[^/]+$/, 'Import job'],
  [/^\/sources\/imports$/, 'Imports'],
  [/^\/sources\/setup\/[^/]+$/, 'Set up source'],
  [/^\/sources(?:\/|$)/, 'Sources'],
  [/^\/notifications$/, 'Inbox'],
  [/^\/settings\/product\/notifications$/, 'Notification preferences'],
  [/^\/settings\/workspace\/account$/, 'Account'],
  [/^\/settings\/workspace\/team$/, 'Team'],
  [/^\/settings\/product\/platform$/, 'Money and reporting'],
  [/^\/settings\/legal\/agreements$/, 'Agreements'],
  [/^\/settings\/legal\/data-privacy$/, 'Data privacy'],
  [/^\/settings\/developers\/api-access$/, 'API access'],
  [/^\/settings\/governance\/audit-trail$/, 'Audit log'],
  [/^\/settings\/billing$/, 'Billing'],
  [/^\/help\/[^/]+$/, 'Help article'],
  [/^\/help$/, 'Help'],
];
const suppliedDetailFallbacks = new Map<string, string>([
  ['Case Review Clean.dc.html', '/cases'],
  ['Loss Detail Clean.dc.html', '/financials/losses'],
  ['Customer Detail Clean.dc.html', '/customers'],
  ['Help Article Clean.dc.html', '/help/case-investigation'],
  ['Order Detail Clean.dc.html', '/search'],
  ['Source Repair Clean.dc.html', '/sources/connected'],
  ['Shipment Detail Clean.dc.html', '/search'],
  ['Flow Run Detail Clean.dc.html', '/controls/flows/runs'],
  ['Recovery Detail Clean.dc.html', '/financials/recovery'],
  ['Rule Editor Clean.dc.html', '/controls/rules'],
  ['Import Job Detail Clean.dc.html', '/sources/imports'],
  ['Mapping Repair Clean.dc.html', '/sources/imports'],
  ['Ticket Detail Clean.dc.html', '/search'],
  ['Named Report Clean.dc.html', '/financials/reports/financial'],
  ['Write Off Clean.dc.html', '/financials/losses'],
  ['Refund Detail Clean.dc.html', '/search'],
]);

const canonicalSurfaceMatchers = surfaceManifest.map((surface) => ({
  id: surface.id,
  dynamic: surface.pathPattern.includes('['),
  pattern: new RegExp(`^${surface.pathPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\[[^/]+\\\]/g, '[^/]+')}$`),
}));

function isCanonicalDynamicSurface(pathname: string) {
  const matches = canonicalSurfaceMatchers.filter((surface) => surface.pattern.test(pathname));
  return !matches.some((surface) => !surface.dynamic) && matches.some((surface) => surface.dynamic);
}

function subscribeCompactDesk(listener: () => void) {
  const query = window.matchMedia(compactDeskQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

function compactDeskSnapshot() {
  return window.matchMedia(compactDeskQuery).matches;
}

function compactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return Children.toArray(node.props.children).map(compactText).join(' ').replace(/\s+/g, ' ').trim();
}

const workspacePalette = new Map([
  ['#1c1f23', '#1c1f23'], ['#40454a', '#40454a'],
  ['#64686d', '#64686d'], ['#64686d', '#64686d'],
  ['#64686d', '#64686d'], ['#a7abad', '#a7abad'],
  ['#ffffff', '#ffffff'], ['#f4f3f1', '#f4f3f1'],
  ['#fff3e9', '#fff3e9'], ['#eae8e5', '#eae8e5'],
  ['#e4e3e0', '#e4e3e0'], ['#e4e3e0', '#e4e3e0'],
  ['#eae8e5', '#eae8e5'], ['#ff7a30', '#ff7a30'],
  ['#9b470d', '#9b470d'], ['#8a3905', '#8a3905'],
]);
const workspacePalettePattern = /#[\da-f]{6}\b/gi;

function alignPaletteValue(value: string) {
  return value.replace(workspacePalettePattern, (match) => workspacePalette.get(match.toLowerCase()) ?? match);
}

function alignPaletteStyle(style: CSSProperties | undefined): CSSProperties | undefined {
  if (!style) return style;
  return Object.fromEntries(Object.entries(style).map(([key, value]) =>
    [key, typeof value === 'string' ? alignPaletteValue(value) : value])) as CSSProperties;
}

function alignWorkspacePalette(node: ReactNode): ReactNode {
  if (!isValidElement<{ children?: ReactNode; style?: CSSProperties; stroke?: string; fill?: string }>(node)) return node;
  const props: Record<string, unknown> = {};
  if (node.props.style) props.style = alignPaletteStyle(node.props.style);
  if (node.props.stroke) props.stroke = alignPaletteValue(node.props.stroke);
  if (node.props.fill) props.fill = alignPaletteValue(node.props.fill);
  const children = Children.map(node.props.children, alignWorkspacePalette);
  return cloneElement(node as ReactElement<Record<string, unknown>>, props, children);
}

function hasScreenLabel(node: ReactNode, label: string | undefined): boolean {
  if (!label || !isValidElement<Record<string, unknown>>(node)) return false;
  if (node.props['data-screen-label'] === label) return true;
  return Children.toArray(node.props.children as ReactNode).some((child) => hasScreenLabel(child, label));
}

function NavigationLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { pending } = useLinkStatus();
  return <span style={{ ...style, ...(pending ? { animation: 'om-shimmer 1s ease-in-out infinite' } : {}) }}>
    {children}
    {pending ? <span className="sr-only" role="status">Opening {compactText(children)}…</span> : null}
  </span>;
}

function bindShellNode(
  node: ReactNode,
  replacements: ReadonlyMap<string, string>,
  openPalette: () => void,
  caseReturnHref?: string | null,
  permissions?: ReadonlySet<Permission>,
): ReactNode {
  if (typeof node === 'string') return replacements.get(node) ?? node;
  if (!isValidElement<{ children?: ReactNode; href?: string; style?: CSSProperties }>(node)) return node;
  if (permissions) {
    const link = node.type === 'a' ? node : node.props.style?.padding === '7px 10px'
      ? Children.toArray(node.props.children).find((child) => isValidElement<{ href?: string }>(child) && child.type === 'a')
      : null;
    if (isValidElement<{ href?: string }>(link)) {
      const route = Object.values(APP_ROUTES).find((entry) => entry.href === link.props.href)
        ?? Object.values(APP_ROUTES).find((entry) => 'sectionPrefix' in entry && link.props.href?.startsWith(`${entry.sectionPrefix}/`));
      if (route && 'permission' in route && !permissions.has(route.permission)) return null;
    }
  }
  const text = compactText(node);
  const props: Record<string, unknown> = {};
  if (node.type === 'div' && text === 'Search' && node.props.style?.padding === '5px 9px') {
    props.role = 'button';
    props.tabIndex = 0;
    props['aria-label'] = 'Search and navigate';
    props.onClick = openPalette;
    props.onKeyDown = (event: { key: string; preventDefault: () => void }) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openPalette();
    };
  }
  if (node.type === 'a' && node.props.href === '#' && text === 'Imports') props.href = APP_ROUTES.imports.href;
  if (node.type === 'a' && node.props.href?.startsWith('/settings/')) props['aria-label'] = 'Open Settings';
  if (node.type === 'a' && node.props.href === '/cases' && caseReturnHref) {
    props.href = caseReturnHref;
    props['aria-label'] = caseReturnHref.startsWith('/work') ? 'Back to work' : 'Back to cases';
  } else if (node.type === 'a' && (node.props.href?.includes('Command Palette') || text.includes('⌘K'))) {
    props.href = '#';
    props.role = 'button';
    props['aria-label'] = 'Search and navigate';
    props.onClick = (event: { preventDefault: () => void }) => {
      event.preventDefault();
      openPalette();
    };
  } else if (text === 'Try again') {
    props.role = 'button';
    props.tabIndex = 0;
    props.onClick = () => window.location.reload();
    props.onKeyDown = (event: { key: string; preventDefault: () => void }) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      window.location.reload();
    };
  } else if (node.type === 'a' && node.props.href && suppliedDetailFallbacks.has(node.props.href)) {
    props.href = suppliedDetailFallbacks.get(node.props.href);
  }
  const children = Children.map(node.props.children, (child) => bindShellNode(child, replacements, openPalette, caseReturnHref, permissions));
  // The reference wraps each navigation label in a padded row. Make that
  // entire row the link, including its icon and count, without nesting links.
  if (node.type === 'div' && node.props.style?.padding === '7px 10px') {
    const entries = Children.toArray(children);
    const link = entries.find((child) => isValidElement<{ href?: string }>(child) && child.props.href?.startsWith('/'));
    if (isValidElement<{ href: string; children?: ReactNode; style?: CSSProperties; 'aria-label'?: string }>(link)) {
      return <Link {...node.props} href={link.props.href} prefetch={false} aria-label={link.props['aria-label'] ?? compactText(link)} data-reference-tag="div">
        {entries.map((child) => child === link ? <NavigationLabel key={link.key} style={link.props.style}>{link.props.children}</NavigationLabel> : child)}
      </Link>;
    }
  }
  const href = typeof props.href === 'string' ? props.href : node.props.href;
  if (node.type === 'a' && href?.startsWith('/')) {
    return <Link {...node.props} {...props} href={href} prefetch={false}>{children}</Link>;
  }
  return cloneElement(node as ReactElement, props, children);
}

function sourceParts(page: () => ReactElement) {
  const root = page() as ReactElement<{ children?: ReactNode }>;
  const parts = Children.toArray(root.props.children).filter(isValidElement) as ReactElement<{ children?: ReactNode; style?: CSSProperties }>[];
  const rail = parts.find((part) => part.props.style?.width === '56px') ?? null;
  const navigation = parts.find((part) => part.props.style?.width === '238px') ?? null;
  const main = parts.find((part) => part.props.style?.flex === '1' && part.props.style?.flexDirection === 'column') ?? null;
  const mainChildren = main ? Children.toArray(main.props.children) : [];
  const topbarIndex = mainChildren.findIndex((part) => (
    isValidElement<{ style?: CSSProperties }>(part) && part.props.style?.height === '50px'
  ));
  const topbar = topbarIndex >= 0 && isValidElement(mainChildren[topbarIndex])
    ? mainChildren[topbarIndex]
    : null;
  const mainBody = mainChildren.filter((_, index) => index !== topbarIndex);
  const extras = parts.filter((part) => part !== rail && part !== navigation && part !== main);
  return { root, rail, navigation, main, topbar, mainBody, extras };
}

// Use the complete supplied navigation on every route. Detail/loading archives
// contain abbreviated sidebars; they describe a capture, not available routes.
const workspaceChrome = sourceParts(authenticatedSourceForPath('/overview'));

function bindNavigationState(node: ReactNode, pathname: string, permissions: ReadonlySet<Permission>): ReactNode {
  if (!isValidElement<{ children?: ReactNode; style?: CSSProperties; href?: string }>(node)) return node;
  const text = compactText(node);
  const route = Object.values(APP_ROUTES).find((entry) => entry.href === node.props.href)
    ?? (node.props.href?.startsWith('/settings/') ? APP_ROUTES.settings : undefined)
    ?? (node.props.style?.padding === '8px 10px' && text === 'Overview' ? APP_ROUTES.dashboard : undefined);
  if (route) {
    if ('permission' in route && !permissions.has(route.permission)) return null;
    const active = isAppRouteActive(pathname, route);
    const children = Children.map(node.props.children, (child) => {
      if (!isValidElement<{ style?: CSSProperties }>(child)) return child;
      if (child.type === 'svg') return cloneElement(child as ReactElement<Record<string, unknown>>, { stroke: active ? '#1c1f23' : '#64686d' });
      if (child.props.style?.flex === '1') return cloneElement(child, { style: { ...child.props.style, color: active ? '#1c1f23' : '#40454a', fontWeight: active ? 500 : 400 } });
      return child;
    });
    return <Link key={node.key} href={route.href} prefetch={false} aria-label={route.key === 'settings' ? 'Open Settings' : route.label} aria-current={active ? 'page' : undefined}
      style={{ ...node.props.style, flexShrink: 0, textDecoration: 'none', background: active ? '#f4f3f1' : undefined, boxShadow: active ? 'inset 0 0 0 1px rgba(28,27,25,.08)' : undefined }}
      onMouseEnter={(event) => { if (!active) event.currentTarget.style.background = '#f7f5f2'; }}
      onMouseLeave={(event) => { if (!active) event.currentTarget.style.background = ''; }}>
      {children}
    </Link>;
  }
  return cloneElement(node, node.type === 'div' ? { style: { ...node.props.style, flexShrink: 0 } } : {}, Children.map(node.props.children, (child) => bindNavigationState(child, pathname, permissions)));
}

export function ExactAuthenticatedShell({
  children,
  pathname,
  workspaceName,
  reportingCurrency,
  timezone,
  workspaces,
  activeMerchantId,
  userName,
  userEmail = '',
  userRole,
  permissions,
  sourceLabel,
  screenshotMode = false,
  workCount,
  caseCount,
  reconciliationCount,
  sourcePageOverride,
  acceptanceScenarioId = null,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const breadcrumbLabel = useBreadcrumbOverride();
  const breadcrumbDetail = useBreadcrumbDetailOverride();
  const breadcrumbParent = useBreadcrumbParentOverride();
  const compactDesk = useSyncExternalStore(subscribeCompactDesk, compactDeskSnapshot, () => false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteOpener = useRef<HTMLElement | null>(null);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteResults, setPaletteResults] = useState<PaletteResult[]>([]);
  const [paletteStatus, setPaletteStatus] = useState('Type at least two characters');
  const [paletteSelection, setPaletteSelection] = useState(0);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationRef = useRef<HTMLElement | null>(null);
  const navigationToggleRef = useRef<HTMLButtonElement | null>(null);
  const sourcePage = sourcePageOverride ?? authenticatedSourceForPath(pathname);
  const source = sourceParts(sourcePage);
  const name = workspaceName?.trim() || 'Workspace';
  const permissionSet = new Set(permissions);
  const replacements = new Map<string, string>([
    ['Asterlane', name],
    ['GBP · Europe/London', `${reportingCurrency ?? 'Currency unavailable'} · ${timezone ?? 'Timezone unavailable'}`],
    ['A', name[0]?.toUpperCase() ?? 'W'],
    ['Rahul Mehta', userName?.trim() || 'Workspace member'],
    ['RM', userName?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'WM'],
    ['Analyst · read + record', userRole.toLowerCase() === 'analyst' ? 'Analyst · read + record' : `${userRole} · workspace access`],
    ['23', workCount == null ? '—' : formatNumber(workCount)],
    ['23 items · £10,006.00 at risk', `${workCount == null ? '—' : formatNumber(workCount)} tasks · exceptions included below`],
    ['218', caseCount == null ? '—' : formatNumber(caseCount)],
    ['4', reconciliationCount == null ? '—' : formatNumber(reconciliationCount)],
  ]);
  replacements.set('as of 1 Sep 09:02 · 5 of 6 sources current', sourceLabel);
  replacements.set('as of 1 Sep 09:02 · Gorgias 3 days stale', sourceLabel);
  replacements.set('as of 1 Sep 09:02 · 3 deadlines inside 7 days', sourceLabel);
  replacements.set('settlements to 1 Sep 06:00 · 4 unmatched', sourceLabel);
  if (pathname === '/financials/reconciliation') replacements.set('August 2026', breadcrumbLabel ?? 'Reconciliation period');
  replacements.set('Gorgias last imported 3d ago', sourceLabel);
  replacements.set('9 cases wait on helpdesk evidence. Figures below exclude it.', 'Check source health for current connection and evidence availability.');
  const [sourceName, ...sourceStatus] = sourceLabel.split(' · ');
  replacements.set('Gorgias token', sourceName);
  replacements.set('expired', sourceStatus.join(' · ') || 'See source health');
  replacements.set('14 rows', screenshotMode ? 'Up to date' : 'Not loaded');
  replacements.set('no source', screenshotMode ? 'Connected' : 'Not loaded');
  if (screenshotMode) replacements.set('connected is not current →', 'all evidence layers current →');
  replacements.set('1,468 accounts have claimed at least once', 'Customer claim coverage shown below');
  replacements.set('as of 1 Sep 06:00 · Shopify current', sourceLabel);
  // These reference-only queue breakdowns are not supplied by the shell loader.
  replacements.set('31', '—');
  replacements.set('44', '—');
  replacements.set('12', '—');
  if (pathname === '/financials/losses') {
    replacements.set('August 2026', TIME_RANGE_LABELS[parseReportRange(searchParams.get('range') ?? undefined)]);
    replacements.set('append only · corrections add rows · as of 1 Sep 06:00', 'append only · corrections add rows');
  }
  const openPalette = () => {
    paletteOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPaletteOpen(true);
  };
  const rail = workspaceChrome.rail ? bindShellNode(workspaceChrome.rail, replacements, openPalette, null, permissionSet) : null;
  const navigation = (!compactDesk || navigationOpen) && workspaceChrome.navigation
    ? bindNavigationState(bindShellNode(workspaceChrome.navigation, replacements, openPalette, null, permissionSet), pathname, permissionSet)
    : null;
  const caseReturnHref = /^\/cases\/[^/]+$/.test(pathname)
    ? safeInternalReturn(searchParams.get('return') ?? undefined)
    : null;
  let topbar = source.topbar ? bindShellNode(source.topbar, replacements, openPalette, caseReturnHref) : null;
  if (isValidElement<{ children?: ReactNode }>(topbar)) {
    const entries = Children.toArray(topbar.props.children);
    const spacer = entries.findIndex(entry => isValidElement<{ style?: CSSProperties }>(entry) && entry.props.style?.flex === '1' && !compactText(entry));
    const named = entries.flatMap((entry, index) => isValidElement(entry) && compactText(entry) && index < spacer ? [index] : []);
    const summaries = entries.flatMap((entry, index) => isValidElement(entry) && entry.type === 'span' && compactText(entry) && index > spacer ? [index] : []);
    const evidenceCustomer = pathname.match(/^\/customers\/([^/]+)\/evidence\/new$/)?.[1];
    const isDynamic = isCanonicalDynamicSurface(pathname);
    const label = pathname === '/search' ? searchParams.get('q')?.trim() || 'Search records' : breadcrumbLabel ?? (isDynamic ? 'Record details unavailable' : null);
    topbar = cloneElement(topbar, { 'data-runtime-topbar': pathname } as Record<string, unknown>, entries.map((entry, index) => {
      if (!isValidElement<Record<string, unknown>>(entry)) return entry;
      if (summaries.includes(index)) {
        // Source HTML never supplies a runtime count, date, actor or health dot.
        const value = index === summaries[0] ? breadcrumbDetail ?? (screenshotMode ? 'Connected workspace · activity up to date' : 'Record summary unavailable') : null;
        return value ? cloneElement(entry, {}, value) : null;
      }
      if (index === named[0] && evidenceCustomer) {
        return <Link key={entry.key} href={breadcrumbParent?.href ?? `/customers/${evidenceCustomer}`} prefetch={false} style={entry.props.style as CSSProperties}>{breadcrumbParent?.label ?? 'Customer identity unavailable'}</Link>;
      }
      if (index === named[named.length - 1]) return label !== null && (isDynamic || named.length === 1 || compactText(entries[named[0]]) !== label) ? cloneElement(entry, {}, label) : entry;
      // Keep canonical section labels; replace any reference-record ancestor.
      if (index !== named[0] && named.includes(index)) return cloneElement(entry, {}, 'Record');
      return entry;
    }));
  }
  topbar = alignWorkspacePalette(topbar);

  useEffect(() => {
    setNavigationOpen(false);
  }, [pathname, compactDesk]);

  useEffect(() => {
    if (!compactDesk || !navigationOpen) return;
    navigationRef.current?.querySelector<HTMLElement>('a, button, [tabindex="0"]')?.focus();
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !navigationRef.current?.contains(event.target) && !navigationToggleRef.current?.contains(event.target)) setNavigationOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [compactDesk, navigationOpen]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('[role="dialog"]')) paletteOpener.current = document.activeElement;
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setNavigationOpen(false);
        if (navigationRef.current?.contains(document.activeElement)) navigationToggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  useEffect(() => {
    setPaletteResults([]);
    setPaletteSelection(0);
    if (!paletteOpen || paletteQuery.trim().length < 2) {
      setPaletteStatus('Type at least two characters');
      return;
    }
    const controller = new AbortController();
    setPaletteStatus('Searching…');
    const timer = window.setTimeout(async () => {
      const normalizedQuery = paletteQuery.trim().toLowerCase();
      const navigationResults = getCommandPaletteNavItems(new Set(permissions))
        .filter((item) => `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(normalizedQuery))
        .map((item): PaletteResult | null => {
          const href = safeInternalReturn(item.href);
          return href ? {
            id: `navigation:${item.href}`,
            type: 'navigation',
            label: item.label,
            sublabel: item.description,
            href,
            source: item.group,
          } satisfies PaletteResult : null;
        })
        .filter((item): item is PaletteResult => item !== null);
      setPaletteResults(navigationResults);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(paletteQuery.trim())}&limit=20`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search unavailable');
        const data = await response.json();
        if (controller.signal.aborted) return;
        const order = ['order', 'case', 'customer', 'recovery', 'ticket', 'shipment', 'refund', 'return', 'dispute', 'loss'];
        const recordResults = Array.isArray(data.results) ? data.results.filter((row: { href?: string; type?: string; id?: string; label?: string }) => (
          typeof row.id === 'string' && typeof row.label === 'string' && typeof row.type === 'string' && order.includes(row.type) && safeInternalReturn(row.href)
        )).sort((a: { type: string }, b: { type: string }) => order.indexOf(a.type) - order.indexOf(b.type)) : [];
        const results = [...navigationResults, ...recordResults];
        setPaletteResults(results);
        setPaletteStatus(data.coverage === 'partial' ? 'Partial results · some sources unavailable' : results.length ? '' : 'No matching records');
      } catch {
        if (!controller.signal.aborted) {
          setPaletteResults(navigationResults);
          setPaletteStatus(navigationResults.length ? '' : 'Search unavailable · try again');
        }
      }
    }, 200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [paletteOpen, paletteQuery, activeMerchantId, permissions]);

  useEffect(() => {
    if (!paletteOpen) return;
    const previousFocus = paletteOpener.current;
    return () => { if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
  }, [paletteOpen]);

  function openPaletteResult(href: string, beside = false) {
    const destination = safeInternalReturn(href);
    if (!destination) return;
    if (beside) window.open(destination, '_blank', 'noopener,noreferrer');
    else router.push(destination);
    setPaletteOpen(false);
  }

  function bindPaletteNode(node: ReactNode): ReactNode {
    if (!isValidElement<{ children?: ReactNode; style?: CSSProperties }>(node)) return node;
    const text = compactText(node);
    if (node.type === 'span' && node.props.style?.font?.includes('15px') && text.startsWith('88214')) {
      return <input data-reference-tag="span" role="searchbox" autoFocus aria-label="Search records or navigate" value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          setPaletteSelection((index) => Math.max(0, Math.min(paletteResults.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
        }
        if (event.key === 'Enter' && paletteResults[paletteSelection]) {
          event.preventDefault();
          openPaletteResult(paletteResults[paletteSelection].href, event.metaKey || event.ctrlKey);
        }
      }} style={node.props.style as CSSProperties} />;
    }
    if (node.props.style?.padding === '4px 8px 8px') {
      const templates = Children.toArray(node.props.children).filter(isValidElement) as ReactElement<{ children?: ReactNode; style?: CSSProperties }>[];
      const heading = templates.find((entry) => entry.props.style?.padding === '8px 8px 2px')!;
      const rows = templates.filter((entry) => entry.props.style?.padding === '9px 11px');
      const templateFor = (type: string) => rows[type === 'order' ? 0 : type === 'customer' ? 3 : type === 'recovery' ? 4 : 1]!;
      let previousType = '';
      const rendered = paletteResults.flatMap((result, index) => {
        const template = templateFor(result.type);
        const cells = Children.toArray(template.props.children).filter(isValidElement) as ReactElement[];
        const label = result.type === 'navigation' ? 'NAVIGATION' : result.type === 'recovery' ? 'CLAIMS AND SETTLEMENTS' : `${result.type.toUpperCase()}${result.type === 'loss' ? 'ES' : 'S'}`;
        const group = result.type !== previousType ? cloneElement(heading, { key: `group-${index}` }, `${label} · ${paletteResults.filter((row) => row.type === result.type).length}`) : null;
        previousType = result.type;
        const values = [result.type === 'navigation' ? 'N' : result.type === 'order' ? '#' : result.type === 'customer' ? 'P' : result.type[0].toUpperCase(), result.label, result.sublabel ?? '', result.source];
        const row = cloneElement(template as ReactElement<Record<string, unknown>>, {
          key: `${result.type}-${result.id}`, role: 'link', tabIndex: 0,
          'aria-current': index === paletteSelection ? 'true' : undefined,
          style: { ...template.props.style, background: index === paletteSelection ? rows[0].props.style?.background : undefined, boxShadow: index === paletteSelection ? rows[0].props.style?.boxShadow : undefined },
          onClick: () => openPaletteResult(result.href),
          onFocus: () => setPaletteSelection(index),
          onKeyDown: (event: { key: string; preventDefault: () => void; metaKey: boolean; ctrlKey: boolean }) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPaletteResult(result.href, event.metaKey || event.ctrlKey); }
          },
        }, cells.map((cell, cellIndex) => cloneElement(cell, { key: cellIndex }, values[cellIndex])));
        return group ? [group, row] : [row];
      });
      return cloneElement(node as ReactElement, {}, paletteStatus ? cloneElement(heading as ReactElement<Record<string, unknown>>, { role: 'status' }, paletteStatus) : null, ...rendered);
    }
    const children = Children.map(node.props.children, bindPaletteNode);
    if (node.props.style?.position === 'absolute' && node.props.style?.inset === '0') {
      return cloneElement(node as ReactElement<Record<string, unknown>>, {
        role: 'dialog',
        'aria-label': 'Search and navigate',
        'aria-modal': true,
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
          if (event.key !== 'Tab') return;
          const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input, [tabindex="0"]'));
          const first = targets[0];
          const last = targets[targets.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        },
        onClick: (event: { target: unknown; currentTarget: unknown }) => {
          if (event.target === event.currentTarget) setPaletteOpen(false);
        },
      }, children);
    }
    return cloneElement(node as ReactElement, {}, children);
  }

  let railIndex = 0;
  const boundRail = isValidElement<{ children?: ReactNode }>(rail)
    ? cloneElement(rail, { style: { ...(rail.props as { style?: CSSProperties }).style, minHeight: 0, overflowY: 'auto' } } as Record<string, unknown>, Children.map(rail.props.children, (child) => {
        if (!isValidElement<{ style?: CSSProperties }>(child)) return child;
        if (compactDesk && child.props.style?.width === '28px' && child.props.style?.height === '28px') {
          return <button {...child.props} ref={navigationToggleRef} type="button" data-reference-tag="div" aria-label="Open workspace navigation" aria-expanded={navigationOpen} aria-controls="workspace-navigation" onClick={() => setNavigationOpen((open) => !open)} />;
        }
        if (child.props.style?.width !== '32px' || child.props.style?.height !== '32px') return child;
        const href = railRoutes[railIndex++];
        if (!href) return child;
        const route = Object.values(APP_ROUTES).find((entry) => entry.href === href);
        if (route && 'permission' in route && !permissionSet.has(route.permission)) return null;
        const active = route ? isAppRouteActive(pathname, route) : false;
        return <Link {...child.props} href={href} prefetch={false} aria-label={route?.label ?? href.slice(1)} aria-current={active ? 'page' : undefined} data-reference-tag="div" style={{ ...child.props.style, flexShrink: 0, background: active ? '#f2f0ed' : undefined, boxShadow: active ? 'inset 0 0 0 1px rgba(28,27,25,.07)' : undefined }} />;
      }))
    : rail;

  const switchWorkspace = async () => {
          if (workspaceBusy || workspaces.length < 2) return;
          const target = workspaces.find((workspace) => workspace.id !== activeMerchantId);
          if (!target) return;
          setWorkspaceBusy(true);
          setWorkspaceError(null);
          try {
            const response = await fetch('/api/workspace', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ merchantId: target.id }),
            });
            if (!response.ok) throw new Error('Workspace could not be changed.');
            // A new workspace must discard the previous document's scoped resource cache.
            window.location.reload();
          } catch (error) {
            setWorkspaceError(error instanceof Error ? error.message : 'Workspace could not be changed.');
          } finally {
            setWorkspaceBusy(false);
          }
        };

  function bindWorkspaceControl(node: ReactNode): ReactNode {
    if (!isValidElement<{ children?: ReactNode; style?: CSSProperties }>(node)) return node;
    if (node.props.style?.borderTop === '1px solid #e4e3e0' && node.props.style?.padding === '11px 14px') {
      return <AvatarMenu
        name={userName}
        email={userEmail}
        role={userRole}
        workspaceName={name}
      />;
    }
    const children = Children.map(node.props.children, bindWorkspaceControl);
    if (node.props.style?.padding === '7px 9px') {
      return cloneElement(node as ReactElement<Record<string, unknown>>, {
        role: 'button',
        tabIndex: 0,
        'aria-label': 'Switch workspace',
        'aria-busy': workspaceBusy || undefined,
        onClick: () => void switchWorkspace(),
        onKeyDown: (event: { key: string; preventDefault: () => void }) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          void switchWorkspace();
        },
      }, children);
    }
    return cloneElement(node as ReactElement, {}, children);
  }

  const boundNavigationSource = bindWorkspaceControl(navigation);
  const boundNavigation = isValidElement<{ children?: ReactNode }>(boundNavigationSource)
    ? createElement('aside', {
        ...boundNavigationSource.props,
        ref: navigationRef,
        id: 'workspace-navigation',
        tabIndex: 0,
        style: { ...(boundNavigationSource.props as { style?: CSSProperties }).style, minHeight: 0, overflowY: 'auto', ...(compactDesk ? { position: 'absolute', left: 56, top: 0, bottom: 0, zIndex: 50 } : {}) },
        'aria-label': 'Workspace navigation', 'data-reference-tag': 'div',
      }, boundNavigationSource.props.children)
    : boundNavigationSource;

  if (!source.main) return null;
  const body = acceptanceScenarioId && isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { 'data-state-id': acceptanceScenarioId })
    : children;
  const accessibleBody = alignWorkspacePalette(body);
  const extras = paletteOpen ? sourceParts(CommandPaletteSource).extras : [];
  const sourceScreenLabel = (source.root.props as Record<string, unknown>)['data-screen-label'];
  const routeOwnsScreenLabel = (
    pathname === '/financials/recovery/new'
    || hasScreenLabel(children, typeof sourceScreenLabel === 'string' ? sourceScreenLabel : undefined)
  );
  const main = createElement('main', {
    ...source.main.props,
    style: { ...alignPaletteStyle(source.main.props.style), minHeight: 0, overflow: 'auto' },
    id: 'app-scroll-container',
    role: 'main',
    'data-reference-tag': 'div',
    'data-exact-source-shell': sourcePage.name,
  }, topbar, <h1 data-reference-ignore="accessibility-heading" style={{ position: 'absolute', width: 1, height: 1, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{routeHeadings.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'Unauth'}</h1>, accessibleBody);
  return cloneElement(source.root as ReactElement<Record<string, unknown>>, {
    // Reference dimensions describe a screenshot, not the user's viewport.
    style: { ...alignPaletteStyle((source.root.props as { style?: CSSProperties }).style), height: '100dvh', minHeight: 0, width: '100%', position: 'relative' },
    'data-reference-shell': 'true',
    'data-visual-world': 'supplied-package',
    'data-ui-version': 'supplied-package',
    'data-readiness': 'shell-ready auth-resolved',
    'data-shell-ready': 'true',
    'data-auth-resolved': 'true',
    'data-data-resolved': 'true',
    'data-route-state': 'loaded',
    'data-desktop-product': '',
    ...(paletteOpen ? { 'data-screen-label': (sourceParts(CommandPaletteSource).root.props as Record<string, unknown>)['data-screen-label'] } : routeOwnsScreenLabel ? { 'data-screen-label': undefined } : {}),
    'data-surface-id': undefined,
    'data-state-id': acceptanceScenarioId || undefined,
  }, alignWorkspacePalette(boundRail), alignWorkspacePalette(boundNavigation), main, ...extras.map((part) => alignWorkspacePalette(paletteOpen ? bindPaletteNode(part) : bindShellNode(part, replacements, openPalette))), workspaceError ? <span role="alert" style={{ position: 'fixed', left: 72, bottom: 16, zIndex: 100, padding: '8px 10px', borderRadius: 8, background: '#fdf0e6', color: '#b0431a' }}>{workspaceError}</span> : null);
}
