import {
  AUTHENTICATED_SURFACE_FAMILIES,
  getAuthenticatedSurfaceFamily,
} from '@/lib/product/authenticatedSurfaceFamily';
import {
  AUTHENTICATED_SURFACE_PARITY,
  getSurfaceParityContract,
} from '@/lib/product/authenticatedSurfaceParity';

describe('authenticated surface-family contracts', () => {
  it('ships one visual authority without rollout state', () => {
    expect(AUTHENTICATED_SURFACE_FAMILIES).toEqual([
      'shell',
      'workPayout',
      'lossRecovery',
      'customersObjects',
      'reports',
      'rulesFlows',
      'integrationsSettings',
      'setupSupportCompatibility',
    ]);
  });

  it('maps signed-in routes to a visual QA family', () => {
    expect(getAuthenticatedSurfaceFamily('/claims/claim-1')).toBe('workPayout');
    expect(getAuthenticatedSurfaceFamily('/customers/customer-1')).toBe(
      'customersObjects',
    );
    expect(getAuthenticatedSurfaceFamily('/settings/team')).toBe(
      'integrationsSettings',
    );
    expect(getAuthenticatedSurfaceFamily('/help/how-it-works')).toBe(
      'setupSupportCompatibility',
    );
  });

  it('defines parity and universal states for every family', () => {
    expect(AUTHENTICATED_SURFACE_PARITY).toHaveLength(
      AUTHENTICATED_SURFACE_FAMILIES.length,
    );
    for (const family of AUTHENTICATED_SURFACE_FAMILIES) {
      const contract = getSurfaceParityContract(family);
      expect(contract.routes.length).toBeGreaterThan(0);
      expect(contract.requiredStates).toEqual(
        expect.arrayContaining([
          'loading',
          'success',
          'empty',
          'unavailable',
          'error',
          'permissionDenied',
        ]),
      );
      expect(contract.guarantees.length).toBeGreaterThan(0);
    }
  });
});
