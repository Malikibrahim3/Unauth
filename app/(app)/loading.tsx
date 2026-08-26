'use client';

import { AuthenticatedRouteLoadingSkeleton } from '@/components/navigation/skeletons/pageSkeletons';
import { getPageTitleForPath } from '@/lib/navigation/appRoutes';
import { usePathname } from 'next/navigation';

export default function AuthenticatedRouteLoading() {
  const pathname = usePathname();
  const routeTitle = getPageTitleForPath(pathname) ?? 'workspace page';
  return <div data-surface-id="authenticated-route-loading-shell" data-state-id="authenticated-route-loading-shell"><AuthenticatedRouteLoadingSkeleton title={routeTitle} /></div>;
}
