import type { AuthUiCohort } from './authenticatedUiRollout';

export type CapabilityState =
  | 'loading'
  | 'success'
  | 'empty'
  | 'unavailable'
  | 'error'
  | 'permissionDenied';

export type SurfaceParityContract = {
  cohort: AuthUiCohort;
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
  'Keyboard focus, Escape behaviour, mobile access, and dark-mode contrast remain available.',
  'Missing, stale, invalid, and unreconciled records remain explicit states rather than fabricated zero values.',
] as const;

/**
 * Route-family contract used by Playwright and review checklists. The source
 * interaction audit remains the control-level baseline; this registry makes
 * the non-negotiable behaviour visible beside the rollout switches.
 */
export const AUTHENTICATED_SURFACE_PARITY: readonly SurfaceParityContract[] = [
  {
    cohort: 'shell',
    routes: ['/*'],
    capabilityGroups: ['sidebar', 'mobile navigation', 'workspace switcher', 'command palette', 'notifications', 'toasts', 'dialogs', 'theme'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    cohort: 'workPayout',
    routes: ['/work', '/exceptions', '/claims', '/claims/[id]', '/notifications'],
    capabilityGroups: ['queues', 'filters', 'bulk actions', 'assignment', 'snooze', 'status transitions', 'evidence', 'exports'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    cohort: 'lossRecovery',
    routes: ['/losses', '/losses/[id]', '/recoveries', '/recoveries/[id]', '/partners', '/settings/agreements'],
    capabilityGroups: ['ledger states', 'currency separation', 'evidence gaps', 'correspondence', 'recovery actions', 'source links'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    cohort: 'customersObjects',
    routes: ['/customers', '/customers/[id]', '/customers/[id]/claims', '/customers/[id]/evidence/new', '/orders/[id]', '/shipments/[id]', '/refunds/[id]', '/returns/[id]', '/disputes/[id]', '/tickets/[id]'],
    capabilityGroups: ['search', 'customer drawer', 'record navigation', 'return URL', 'source identifiers', 'timeline'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    cohort: 'reports',
    routes: ['/dashboard', '/reports', '/reports/records'],
    capabilityGroups: ['date range', 'comparison', 'currency', 'charts', 'drill-downs', 'CSV export', 'data health'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    cohort: 'rulesFlows',
    routes: ['/rules', '/rules/[id]', '/flows', '/flows/[id]', '/flows/runs', '/flows/runs/[id]'],
    capabilityGroups: ['drafts', 'validation', 'activation', 'ordering', 'run history', 'unsaved changes'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    cohort: 'integrationsSettings',
    routes: ['/integrations', '/integrations/[provider]', '/integrations/imports', '/settings', '/settings/*'],
    capabilityGroups: ['connections', 'OAuth callbacks', 'sync status', 'imports', 'team roles', 'permissions', 'billing', 'privacy', 'audit trail'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
  {
    cohort: 'setupSupportCompatibility',
    routes: ['/onboarding', '/audit-running', '/help', '/help/*', '/store', '/audit/[id]', '/catches', '/chargebacks', '/watchlist', '/global', '/lookup', '/apply', '/not-found', '/global-error'],
    capabilityGroups: ['setup progression', 'help navigation', 'legacy redirects', 'query preservation', 'error recovery'],
    requiredStates: UNIVERSAL_STATES,
    guarantees: UNIVERSAL_GUARANTEES,
  },
] as const;

export function getSurfaceParityContract(cohort: AuthUiCohort): SurfaceParityContract {
  const contract = AUTHENTICATED_SURFACE_PARITY.find((entry) => entry.cohort === cohort);
  if (!contract) throw new Error(`Missing authenticated UI parity contract for ${cohort}`);
  return contract;
}
