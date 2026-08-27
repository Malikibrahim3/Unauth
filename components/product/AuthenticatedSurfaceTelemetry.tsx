'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getAuthenticatedSurfaceFamily } from '@/lib/product/authenticatedSurfaceFamily';

/** Records the rendered route family without changing which visual system ships. */
export function AuthenticatedSurfaceTelemetry() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      '.ua-app, .ua-auth-surface',
    );
    if (!root) return;

    const family = getAuthenticatedSurfaceFamily(pathname);
    root.dataset.uiSurfaceFamily = family;
    void import('@/lib/analytics/amplitude').then(({ track }) => {
      track('Authenticated UI Viewed', { ui_surface_family: family });
    });
  }, [pathname]);

  return null;
}
