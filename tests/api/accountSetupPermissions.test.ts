import { NextRequest } from 'next/server';

const mockGetUser = jest.fn();
const mockMembershipMaybeSingle = jest.fn();
const mockResolveCallerContext = jest.fn();
const mockHasPermission = jest.fn();
const mockUpsertMerchantForUser = jest.fn();
const mockUpdateUserById = jest.fn();

const membershipQuery = {
  select: jest.fn(() => membershipQuery),
  eq: jest.fn(() => membershipQuery),
  limit: jest.fn(() => membershipQuery),
  maybeSingle: mockMembershipMaybeSingle,
};

const serviceClient = {
  from: jest.fn(() => membershipQuery),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: mockGetUser } }),
  createServiceClient: () => serviceClient,
  createAdminClient: () => ({
    auth: { admin: { updateUserById: mockUpdateUserById } },
  }),
}));

jest.mock('@/lib/permissions', () => {
  const actual = jest.requireActual('@/lib/permissions');
  return {
    ...actual,
    resolveCallerContext: (...args: unknown[]) => mockResolveCallerContext(...args),
    hasPermission: (...args: unknown[]) => mockHasPermission(...args),
  };
});

jest.mock('@/lib/account/upsertMerchantForUser', () => ({
  upsertMerchantForUser: (...args: unknown[]) => mockUpsertMerchantForUser(...args),
}));

jest.mock('@/lib/integrations/applicability', () => ({
  setCategoryApplicability: jest.fn(),
}));

jest.mock('@/lib/connections/getConnectionState', () => ({
  getConnectionState: jest.fn(),
}));

import { POST } from '@/app/api/account/setup/route';

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/account/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('account setup workspace authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'operator@merchant.test',
          user_metadata: {},
        },
      },
    });
    mockUpdateUserById.mockResolvedValue({ error: null });
  });

  it('denies an existing viewer before any workspace profile write', async () => {
    mockResolveCallerContext.mockResolvedValue({
      userId: 'user-1',
      merchantId: 'merchant-viewer',
      role: 'viewer',
      memberId: 'member-1',
    });
    mockMembershipMaybeSingle.mockResolvedValue({ data: { id: 'member-1' }, error: null });
    mockHasPermission.mockResolvedValue(false);

    const response = await POST(request({ storeName: 'Forbidden rename' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Workspace administration permission is required.',
    });
    expect(mockUpsertMerchantForUser).not.toHaveBeenCalled();
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('preserves the authenticated clean-account bootstrap path', async () => {
    mockResolveCallerContext.mockResolvedValue(null);
    mockMembershipMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsertMerchantForUser.mockResolvedValue({
      id: 'new-merchant',
      setup_complete: false,
    });

    const response = await POST(request({ bootstrapOnly: true }));

    expect(response.status).toBe(200);
    expect(mockHasPermission).not.toHaveBeenCalled();
    expect(mockUpsertMerchantForUser).toHaveBeenCalledWith(
      serviceClient,
      expect.objectContaining({ userId: 'user-1', setupComplete: false }),
    );
    expect(mockUpdateUserById).toHaveBeenCalledTimes(1);
  });
  it.each(['under_10k', '10k_50k', '50k_250k', 'over_250k', 'unknown', 1200])('rejects ambiguous or invalid volume %s before persistence', async (volume) => {
    mockResolveCallerContext.mockResolvedValue({ userId: 'user-1', merchantId: 'm1', role: 'owner' });
    mockMembershipMaybeSingle.mockResolvedValue({ data: { id: 'member-1' }, error: null });
    mockHasPermission.mockResolvedValue(true);
    const response = await POST(request({ monthlyOrderVolume: volume }));
    expect(response.status).toBe(400);
    expect(mockUpsertMerchantForUser).not.toHaveBeenCalled();
  });

  it.each(['under_1000', '1000_8000', '8000_15000', 'over_15000', null])('passes an explicit monthly correction or clear %s to persistence', async (volume) => {
    mockResolveCallerContext.mockResolvedValue({ userId: 'user-1', merchantId: 'm1', role: 'owner' });
    mockMembershipMaybeSingle.mockResolvedValue({ data: { id: 'member-1' }, error: null });
    mockHasPermission.mockResolvedValue(true);
    mockUpsertMerchantForUser.mockResolvedValue({ id: 'm1', setup_complete: false });
    const response = await POST(request({ monthlyOrderVolume: volume }));
    expect(response.status).toBe(200);
    expect(mockUpsertMerchantForUser).toHaveBeenCalledWith(serviceClient, expect.objectContaining({ monthlyOrderVolume: volume }));
  });

});
