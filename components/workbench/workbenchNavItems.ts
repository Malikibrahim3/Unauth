import { APP_ROUTES, type AppRouteKey } from '@/lib/navigation/appRoutes';
import type { WorkbenchNavItem } from './WorkbenchNav';

const WORKBENCH_ROUTE_KEYS: AppRouteKey[] = [
  'dashboard',
  'work',
  'customers',
  'claims',
  'losses',
  'recoveries',
];

/** Canonical workbench sub-nav — generated from app route registry. */
export const WORKBENCH_NAV_ITEMS: WorkbenchNavItem[] = WORKBENCH_ROUTE_KEYS.map((key) => ({
  key,
  label: APP_ROUTES[key].label,
  href: APP_ROUTES[key].href,
}));
