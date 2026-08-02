/**
 * Stable route-family classification for visual QA and analytics.
 *
 * This is descriptive metadata, not a rollout switch. Every family always
 * renders the same Decision Ledger visual authority in every environment.
 */
export const AUTHENTICATED_SURFACE_FAMILIES = [
  'shell',
  'workPayout',
  'lossRecovery',
  'customersObjects',
  'reports',
  'rulesFlows',
  'integrationsSettings',
  'setupSupportCompatibility',
] as const;

export type AuthenticatedSurfaceFamily =
  (typeof AUTHENTICATED_SURFACE_FAMILIES)[number];

/** Maps every signed-in route family to one visual-QA and analytics family. */
export function getAuthenticatedSurfaceFamily(
  pathname: string,
): AuthenticatedSurfaceFamily {
  const path = pathname.split('?')[0] || '/dashboard';
  if (path === '/dashboard' || path.startsWith('/reports')) return 'reports';
  if (
    path === '/work' ||
    path === '/exceptions' ||
    path.startsWith('/claims') ||
    path.startsWith('/notifications')
  ) {
    return 'workPayout';
  }
  if (
    path.startsWith('/losses') ||
    path.startsWith('/recoveries') ||
    path.startsWith('/partners') ||
    path.startsWith('/settings/agreements')
  ) {
    return 'lossRecovery';
  }
  if (
    path.startsWith('/customers') ||
    /\/(orders|shipments|refunds|returns|disputes|tickets)\//.test(path)
  ) {
    return 'customersObjects';
  }
  if (path.startsWith('/rules') || path.startsWith('/flows')) {
    return 'rulesFlows';
  }
  if (path.startsWith('/integrations') || path.startsWith('/settings')) {
    return 'integrationsSettings';
  }
  return 'setupSupportCompatibility';
}
