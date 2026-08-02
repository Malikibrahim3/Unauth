import type { AuthenticatedSurfaceFamily } from './authenticatedSurfaceFamily';

export type CapabilityState =
  | 'loading'
  | 'success'
  | 'empty'
  | 'unavailable'
  | 'error'
  | 'permissionDenied';

export type SurfaceParityContract = {
  family: AuthenticatedSurfaceFamily;
  routes: readonly string[];
  capabilityGroups: readonly string[];
  requiredStates: readonly CapabilityState[];
  guarantees: readonly string[];
};

const UNIVERSAL_STATES: readonly CapabilityState[] = [
  'loading',
  'success',
  'empty',
  'unavailable',
  'error',
  'permissionDenied',
];

const UNIVERSAL_GUARANTEES = [
  'Existing authorization and merchant isolation are evaluated before presentation.',
  'Existing query parameters, identifiers, redirects, API payloads, and server actions are preserved.',
  'Keyboard focus, Escape behaviour, accessibility reflow, and dark-mode contrast remain available.',
  'Missing, stale, invalid, and unreconciled records remain explicit states rather than fabricated zero values.',
] as const;

/** Route-family contract used by Playwright, QA manifests, and review checklists. */
export const AUTHENTICATED_SURFACE_PARITY: readonly SurfaceParityContract[] = [
  {
    family: 'shell',
    routes: ['/*'],
    capabilityGroups: ['sidebar', 'workspace switcher', 'command palette', 'notifications', 'toasts', 'dialogs', 'theme'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    family: 'workPayout',
    routes: ['/work', '/exceptions', '/claims', '/claims/[id]', '/notifications'],
    capabilityGroups: ['queues', 'filters', 'bulk actions', 'assignment', 'snooze', 'status transitions', 'evidence', 'exports'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    family: 'lossRecovery',
    routes: ['/losses', '/losses/[id]', '/recoveries', '/recoveries/[id]', '/partners', '/settings/agreements'],
    capabilityGroups: ['ledger states', 'currency separation', 'evidence gaps', 'correspondence', 'recovery actions', 'source links'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    family: 'customersObjects',
    routes: ['/customers', '/customers/[id]', '/customers/[id]/claims', '/customers/[id]/evidence/new', '/orders/[id]', '/shipments/[id]', '/refunds/[id]', '/returns/[id]', '/disputes/[id]', '/tickets/[id]'],
    capabilityGroups: ['search', 'customer drawer', 'record navigation', 'return URL', 'source identifiers', 'timeline'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    family: 'reports',
    routes: ['/dashboard', '/reports', '/reports/records'],
    capabilityGroups: ['date range', 'comparison', 'currency', 'charts', 'drill-downs', 'CSV export', 'data health'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    family: 'rulesFlows',
    routes: ['/rules', '/rules/[id]', '/flows', '/flows/[id]', '/flows/runs', '/flows/runs/[id]'],
    capabilityGroups: ['drafts', 'validation', 'activation', 'ordering', 'run history', 'unsaved changes'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    family: 'integrationsSettings',
    routes: ['/integrations', '/integrations/[provider]', '/integrations/imports', '/settings', '/settings/*'],
    capabilityGroups: ['connections', 'OAuth callbacks', 'sync status', 'imports', 'team roles', 'permissions', 'billing', 'privacy', 'audit trail'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    family: 'setupSupportCompatibility',
    routes: ['/onboarding', '/audit-running', '/help', '/help/*', '/store', '/audit/[id]', '/catches', '/chargebacks', '/watchlist', '/global', '/lookup', '/apply', '/not-found', '/global-error'],
    capabilityGroups: ['setup progression', 'help navigation', 'legacy redirects', 'query preservation', 'error recovery'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
] as const;

export function getSurfaceParityContract(
  family: AuthenticatedSurfaceFamily,
): SurfaceParityContract {
  const contract = AUTHENTICATED_SURFACE_PARITY.find(
    (entry) => entry.family === family,
  );
  if (!contract) {
    throw new Error('Missing authenticated surface parity contract for ' + family);
  }
  return contract;
}
