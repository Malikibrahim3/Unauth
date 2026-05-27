import type { WorkbenchNavItem } from './WorkbenchNav';

/** Canonical workbench sub-nav labels — aligned with sidebar IA. */
export const WORKBENCH_NAV_ITEMS: WorkbenchNavItem[] = [
  { key: 'overview', label: 'Overview', href: '/dashboard' },
  { key: 'inbox', label: 'Inbox', href: '/inbox' },
  { key: 'customers', label: 'Customers', href: '/customers' },
  { key: 'audits', label: 'Audit history', href: '/history' },
  { key: 'reports', label: 'Reports', href: '/reports' },
];
