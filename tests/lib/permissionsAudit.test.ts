import { createServiceClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/permissions/audit';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

const context = {
  merchantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  role: 'owner',
} as const;

describe('logAction', () => {
  it('writes an empty metadata object when callers omit metadata', () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    (createServiceClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({ insert })),
    });

    logAction({
      ctx: context as never,
      action: 'view_customer',
      resourceType: 'source_customer',
      resourceId: 'customer-1',
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }));
  });

  it('preserves supplied metadata', () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    (createServiceClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({ insert })),
    });

    logAction({
      ctx: context as never,
      action: 'update_settings',
      metadata: { provider: 'gorgias' },
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { provider: 'gorgias' },
    }));
  });
});
