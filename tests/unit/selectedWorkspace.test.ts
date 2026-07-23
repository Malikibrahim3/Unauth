import { PERMISSIONS, requirePermissionForMerchant, resolveCallerContext } from '@/lib/permissions';

function serviceWithMemberships(rows: Array<{ id: string; merchant_id: string; role: string }>) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    then: (resolve: (value: { data: typeof rows }) => unknown) => Promise.resolve({ data: rows }).then(resolve),
  };
  return { from: jest.fn(() => query), auth: {} } as never;
}

describe('selected workspace resolution', () => {
  const memberships = [
    { id: 'viewer-member', merchant_id: 'merchant-viewer', role: 'viewer' },
    { id: 'owner-member', merchant_id: 'merchant-owner', role: 'owner' },
  ];

  it('honours a selected active membership instead of role rank', async () => {
    const context = await resolveCallerContext(serviceWithMemberships(memberships), 'user-1', 'merchant-viewer');
    expect(context).toMatchObject({ merchantId: 'merchant-viewer', role: 'viewer' });
  });

  it('fails closed for a forged workspace id instead of choosing another tenant', async () => {
    const context = await resolveCallerContext(serviceWithMemberships(memberships), 'user-1', 'not-a-membership');
    expect(context).toBeNull();
  });

  it('requires an explicit selection when several active memberships exist', async () => {
    const context = await resolveCallerContext(serviceWithMemberships(memberships), 'user-1');
    expect(context).toBeNull();
  });

  it('accepts the only active membership when selection is unnecessary', async () => {
    const context = await resolveCallerContext(
      serviceWithMemberships([memberships[0]]),
      'user-1',
    );
    expect(context).toMatchObject({ merchantId: 'merchant-viewer', role: 'viewer' });
  });

  it('never falls back when an OAuth callback requires an exact merchant', async () => {
    const result = await requirePermissionForMerchant(
      serviceWithMemberships(memberships),
      'user-1',
      'not-a-membership',
      PERMISSIONS.MANAGE_SETTINGS,
    );
    expect(result.denied?.status).toBe(403);
    expect(result.ctx).toBeNull();
  });
});
