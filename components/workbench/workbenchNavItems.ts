import type { WorkbenchNavItem } from './WorkbenchNav';

/** Canonical workbench sub-nav labels — aligned with sidebar IA. */
export const WORKBENCH_NAV_ITEMS: WorkbenchNavItem[] = [
  { key: 'overview', label: 'Overview', href: '/dashboard' },
  { key: 'customers', label: 'Customers', href: '/customers' },
  { key: 'audits', label: 'Audit history', href: '/history' },
  { key: 'evidence', label: 'Evidence packages', href: '/chargebacks' },
];
