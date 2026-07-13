import { resolveCallerContext } from '@/lib/permissions';

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

  it('ignores forged workspace ids and safely falls back to an active membership', async () => {
    const context = await resolveCallerContext(serviceWithMemberships(memberships), 'user-1', 'not-a-membership');
    expect(context).toMatchObject({ merchantId: 'merchant-owner', role: 'owner' });
  });
});
