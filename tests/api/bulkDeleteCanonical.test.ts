import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));
jest.mock('@/lib/supabase/scoped', () => ({ createScopedClient: jest.fn() }));
jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { BULK_DELETE: 'bulk_delete' },
  requirePermission: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission } from '@/lib/permissions';
import { POST } from '@/app/api/settings/bulk-delete/route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/settings/bulk-delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('canonical workspace removal controls', () => {
  const updates: Array<{ table: string; patch: Record<string, unknown>; inFilter?: [string, string[]] }> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    updates.length = 0;
    (createClient as jest.Mock).mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    });
    (createServiceClient as jest.Mock).mockReturnValue({});
    (requirePermission as jest.Mock).mockResolvedValue({
      denied: null,
      ctx: { merchantId: 'merchant-1', userId: 'user-1', role: 'owner' },
    });
    (createScopedClient as jest.Mock).mockReturnValue({
      from(table: string) {
        const operation: { table: string; patch: Record<string, unknown>; inFilter?: [string, string[]] } = {
          table,
          patch: {},
        };
        const builder = {
          update(patch: Record<string, unknown>) {
            operation.patch = patch;
            updates.push(operation);
            return builder;
          },
          in(column: string, ids: string[]) {
            operation.inFilter = [column, ids];
            return Promise.resolve({ error: null });
          },
          then(resolve: (value: { error: null }) => unknown) {
            return Promise.resolve(resolve({ error: null }));
          },
        };
        return builder;
      },
    });
  });

  it('uses the real canonical soft-hide fields for every listed category', async () => {
    const response = await POST(request({ entity: 'all', confirm: true }));
    expect(response.status).toBe(200);
    expect(updates).toEqual([
      expect.objectContaining({ table: 'identity_notes', patch: { deleted_at: expect.any(String) } }),
      expect.objectContaining({
        table: 'merchant_identity_state',
        patch: { on_watchlist: false, display_name: null, display_email: null },
      }),
      expect.objectContaining({ table: 'sync_jobs', patch: { hidden: true } }),
    ]);
  });

  it('filters saved-customer context by its composite-key identity column', async () => {
    const response = await POST(request({ entity: 'watchlist', ids: ['identity-1'], confirm: true }));
    expect(response.status).toBe(200);
    expect(updates[0]).toMatchObject({
      table: 'merchant_identity_state',
      inFilter: ['identity_id', ['identity-1']],
    });
  });
});
