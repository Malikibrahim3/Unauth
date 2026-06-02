import { getWorkbenchNavItems } from '@/lib/navigation/appRoutes';
import type { WorkbenchNavItem } from './WorkbenchNav';

/** Canonical workbench sub-nav — generated from app route registry. */
export const WORKBENCH_NAV_ITEMS: WorkbenchNavItem[] = getWorkbenchNavItems();
