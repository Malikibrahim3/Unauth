'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getAuthUiCohortForPath } from '@/lib/product/authenticatedUiRollout';
import { track } from '@/lib/analytics/amplitude';

/** Keeps rollout analytics tied to the route actually rendered after navigation. */
export function AuthUiCohortTelemetry() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.ua-app, .ua-auth-surface');
    if (!root) return;

    const cohort = getAuthUiCohortForPath(pathname);
    root.dataset.uiCohort = cohort;
    track('Authenticated UI Viewed', { ui_cohort: cohort });
  }, [pathname]);

  return null;
}
