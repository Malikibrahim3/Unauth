/**
 * Reversible presentation-only rollout controls for the authenticated app.
 *
 * These flags must never grant product access or change a server action. They
 * select a visual composition after the route has already completed its
 * existing authentication, merchant-isolation, and permission checks.
 */
export const AUTH_UI_COHORTS = [
  'shell',
  'workPayout',
  'lossRecovery',
  'customersObjects',
  'reports',
  'rulesFlows',
  'integrationsSettings',
  'setupSupportCompatibility',
] as const;

export type AuthUiCohort = (typeof AUTH_UI_COHORTS)[number];

export const AUTH_UI_ROLLOUT_COOKIE = 'unauth.auth_ui_cohorts';
export const AUTH_UI_ROLLOUT_ENV = 'AUTH_UI_COHORTS';

export type AuthUiRollout = {
  enabled: ReadonlySet<AuthUiCohort>;
  source: 'environment' | 'non-production-cookie' | 'default';
};

const DEFAULT_DEVELOPMENT_COHORTS: AuthUiCohort[] = ['shell', 'reports'];

function isCohort(value: string): value is AuthUiCohort {
  return (AUTH_UI_COHORTS as readonly string[]).includes(value);
}

/** Parses a comma-separated cohort list. `all` is intentionally explicit. */
export function parseAuthUiCohorts(value?: string | null): Set<AuthUiCohort> {
  const requested = value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

  if (requested.includes('all')) return new Set(AUTH_UI_COHORTS);
  return new Set(requested.filter(isCohort));
}

/**
 * Environment flags are authoritative. Cookie overrides exist only outside
 * production so a design review can safely test a cohort without changing a
 * tenant's business behaviour or exposing a production feature switch.
 */
export function resolveAuthUiRollout(input: {
  environment?: string | null;
  environmentValue?: string | null;
  cookieValue?: string | null;
} = {}): AuthUiRollout {
  const environment = (input.environment ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase();
  const environmentValue = input.environmentValue ?? process.env[AUTH_UI_ROLLOUT_ENV];

  if (environmentValue != null) {
    return { enabled: parseAuthUiCohorts(environmentValue), source: 'environment' };
  }

  if (environment !== 'production' && input.cookieValue) {
    return { enabled: parseAuthUiCohorts(input.cookieValue), source: 'non-production-cookie' };
  }

  return {
    enabled: new Set(environment === 'production' ? [] : DEFAULT_DEVELOPMENT_COHORTS),
    source: 'default',
  };
}

export function isAuthUiCohortEnabled(
  cohort: AuthUiCohort,
  rollout: Pick<AuthUiRollout, 'enabled'>,
): boolean {
  return rollout.enabled.has(cohort);
}

/** Maps every signed-in route family to exactly one presentation cohort. */
export function getAuthUiCohortForPath(pathname: string): AuthUiCohort {
  const path = pathname.split('?')[0] || '/dashboard';
  if (path === '/dashboard' || path.startsWith('/reports')) return 'reports';
  if (path === '/work' || path === '/exceptions' || path.startsWith('/claims') || path.startsWith('/notifications')) return 'workPayout';
  if (path.startsWith('/losses') || path.startsWith('/recoveries') || path.startsWith('/partners') || path.startsWith('/settings/agreements')) return 'lossRecovery';
  if (path.startsWith('/customers') || /\/(orders|shipments|refunds|returns|disputes|tickets)\//.test(path)) return 'customersObjects';
  if (path.startsWith('/rules') || path.startsWith('/flows')) return 'rulesFlows';
  if (path.startsWith('/integrations') || path.startsWith('/settings')) return 'integrationsSettings';
  return 'setupSupportCompatibility';
}
