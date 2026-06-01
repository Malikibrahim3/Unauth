import type { WorkbenchNavItem } from './WorkbenchNav';

/** Canonical workbench sub-nav labels — aligned with sidebar IA. */
export const WORKBENCH_NAV_ITEMS: WorkbenchNavItem[] = [
  { key: 'overview', label: 'Overview', href: '/dashboard' },
  { key: 'customers', label: 'Customers', href: '/customers' },
  { key: 'watchlist', label: 'Watchlist', href: '/watchlist' },
  { key: 'evidence', label: 'Evidence packages', href: '/chargebacks' },
  { key: 'reports', label: 'Reports', href: '/reports' },
  { key: 'audits', label: 'Import history', href: '/history' },
];
