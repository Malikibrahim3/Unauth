import {
  preservedRedirectTarget,
  safeUuidRedirectSegment,
} from '@/lib/navigation/preservedRedirect';
import {
  normalizeRequestedSearchApiTypes,
  partitionSearchApiTypes,
} from '@/lib/search/access';
import { PERMISSIONS } from '@/lib/permissions';
import { APP_ROUTES, isAppRouteActive } from '@/lib/navigation/appRoutes';

describe('P08 cross-route integrity', () => {
  it('preserves repeated adapter query state in order', () => {
    expect(preservedRedirectTarget('/controls/rules', {
      search: 'refund',
      state: ['active', 'draft'],
    })).toBe('/controls/rules?search=refund&state=active&state=draft');
  });

  it('accepts only a single UUID as a redirect path segment', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(safeUuidRedirectSegment(id)).toBe(id);
    expect(safeUuidRedirectSegment('../../settings')).toBeNull();
    expect(safeUuidRedirectSegment([id, '../../settings'])).toBeNull();
  });

  it('partitions search families by the current role permissions', () => {
    const requested = normalizeRequestedSearchApiTypes('customers,cases,losses');
    expect(partitionSearchApiTypes(
      requested,
      new Set([PERMISSIONS.VIEW_CUSTOMERS]),
    )).toEqual({
      authorized: ['customers'],
      restricted: ['cases', 'losses'],
    });
  });

  it('keeps nested canonical surfaces inside their sidebar section', () => {
    expect(isAppRouteActive('/sources/imports/job-1', APP_ROUTES.imports)).toBe(true);
    expect(isAppRouteActive('/sources/imports/job-1', APP_ROUTES.integrations)).toBe(false);
    expect(isAppRouteActive('/settings/legal/agreements', APP_ROUTES.settings)).toBe(true);
    expect(isAppRouteActive('/sources/imports/job-1', APP_ROUTES.settings)).toBe(false);
  });
});
