import {
  AUTH_UI_COHORTS,
  getAuthUiCohortForPath,
  parseAuthUiCohorts,
  resolveAuthUiRollout,
} from '@/lib/product/authenticatedUiRollout';
import {
  AUTHENTICATED_SURFACE_PARITY,
  getSurfaceParityContract,
} from '@/lib/product/authenticatedUiParity';

describe('authenticated UI rollout contracts', () => {
  it('keeps production cohorts disabled until explicitly configured', () => {
    const rollout = resolveAuthUiRollout({ environment: 'production' });
    expect(rollout.enabled.size).toBe(0);
    expect(rollout.source).toBe('default');
  });

  it('accepts non-production review overrides but rejects them in production', () => {
    expect(resolveAuthUiRollout({ environment: 'development', cookieValue: 'workPayout,reports' }).enabled)
      .toEqual(new Set(['workPayout', 'reports']));
    expect(resolveAuthUiRollout({ environment: 'production', cookieValue: 'all' }).enabled.size).toBe(0);
  });

  it('parses explicit all and ignores unknown cohorts', () => {
    expect(parseAuthUiCohorts('reports,not-a-cohort')).toEqual(new Set(['reports']));
    expect(parseAuthUiCohorts('all')).toEqual(new Set(AUTH_UI_COHORTS));
  });

  it('maps signed-in routes to a single visual cohort', () => {
    expect(getAuthUiCohortForPath('/claims/claim-1')).toBe('workPayout');
    expect(getAuthUiCohortForPath('/customers/customer-1')).toBe('customersObjects');
    expect(getAuthUiCohortForPath('/settings/team')).toBe('integrationsSettings');
    expect(getAuthUiCohortForPath('/help/how-it-works')).toBe('setupSupportCompatibility');
  });

  it('defines a parity contract for every cohort and universal state', () => {
    expect(AUTHENTICATED_SURFACE_PARITY).toHaveLength(AUTH_UI_COHORTS.length);
    for (const cohort of AUTH_UI_COHORTS) {
      const contract = getSurfaceParityContract(cohort);
      expect(contract.routes.length).toBeGreaterThan(0);
      expect(contract.requiredStates).toEqual(expect.arrayContaining(['loading', 'success', 'empty', 'unavailable', 'error', 'permissionDenied']));
      expect(contract.guarantees.length).toBeGreaterThan(0);
    }
  });
});
