import { APP_ROUTES, getCommandPaletteNavItems, getSidebarNavItems } from '@/lib/navigation/appRoutes';
import { PERMISSIONS } from '@/lib/permissions';

describe('permission-filtered navigation', () => {
  it('never exposes destinations without their permission', () => {
    const permissions = new Set([PERMISSIONS.VIEW_DASHBOARD]);
    const routes = getSidebarNavItems(permissions).flatMap((group) => group.items);
    expect(routes.map((route) => route.key)).toEqual(['dashboard']);
    expect(routes.every((route) => !route.permission || permissions.has(route.permission))).toBe(true);
  });

  it('filters command destinations with the same contract', () => {
    const permissions = new Set([PERMISSIONS.VIEW_INBOX]);
    const hrefs = getCommandPaletteNavItems(permissions).map((route) => route.href);
    expect(hrefs).toContain(APP_ROUTES.claims.href);
    expect(hrefs).not.toContain(APP_ROUTES.customers.href);
    expect(hrefs).not.toContain(APP_ROUTES.settings.href);
  });
});
