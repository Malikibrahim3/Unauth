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
  const path = pathname.split('?')[0] || '/overview';
  if (path === '/overview' || path.startsWith('/financials/reports')) return 'reports';
  if (
    path === '/work' ||
    path.startsWith('/cases') ||
    path.startsWith('/notifications')
  ) {
    return 'workPayout';
  }
  if (
    path.startsWith('/financials/losses') ||
    path.startsWith('/financials/recovery') ||
    path.startsWith('/partners') ||
    path.startsWith('/settings/legal/agreements')
  ) {
    return 'lossRecovery';
  }
  if (
    path.startsWith('/customers') ||
    /\/(orders|shipments|refunds|returns|disputes|tickets)\//.test(path)
  ) {
    return 'customersObjects';
  }
  if (path.startsWith('/controls/rules') || path.startsWith('/controls/flows')) {
    return 'rulesFlows';
  }
  if (path.startsWith('/sources') || path.startsWith('/settings')) {
    return 'integrationsSettings';
  }
  return 'setupSupportCompatibility';
}
