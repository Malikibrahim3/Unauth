import { APP_ROUTES, getCommandPaletteNavItems, getSidebarNavItems } from '@/lib/navigation/appRoutes';
import { PERMISSIONS, resolvePermissions } from '@/lib/permissions';

describe('permission-filtered navigation', () => {
  it('never exposes destinations without their permission', () => {
    const permissions = new Set([PERMISSIONS.VIEW_DASHBOARD]);
    const routes = getSidebarNavItems(permissions).flatMap((group) => group.items);
    expect(routes.map((route) => route.key)).toEqual(['dashboard', 'notifications', 'help']);
    expect(routes.every((route) => !route.permission || permissions.has(route.permission))).toBe(true);
  });

  it('filters command destinations with the same contract', () => {
    const permissions = new Set([PERMISSIONS.VIEW_INBOX]);
    const hrefs = getCommandPaletteNavItems(permissions).map((route) => route.href);
    expect(hrefs).toContain(APP_ROUTES.claims.href);
    expect(hrefs).not.toContain(APP_ROUTES.customers.href);
    expect(hrefs).not.toContain(APP_ROUTES.settings.href);
  });

  it('resolves delegated shell permissions with one bulk grant query', async () => {
    const rows = [{ permission: PERMISSIONS.MANAGE_SETTINGS }];
    const query = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      then: (resolve: (value: { data: typeof rows }) => unknown) => Promise.resolve({ data: rows }).then(resolve),
    };
    const service = { from: jest.fn(() => query) } as never;

    const permissions = await resolvePermissions(service, {
      userId: 'viewer-1',
      merchantId: 'merchant-1',
      role: 'viewer',
      memberId: 'member-1',
    });

    expect(service.from).toHaveBeenCalledTimes(1);
    expect(permissions).toEqual(expect.arrayContaining([
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.MANAGE_SETTINGS,
    ]));
  });

  it('does not query delegated grants for an owner', async () => {
    const service = { from: jest.fn() } as never;
    const permissions = await resolvePermissions(service, {
      userId: 'owner-1',
      merchantId: 'merchant-1',
      role: 'owner',
      memberId: null,
    });

    expect(service.from).not.toHaveBeenCalled();
    expect(permissions).toHaveLength(Object.keys(PERMISSIONS).length);
  });
});
