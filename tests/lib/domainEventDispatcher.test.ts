import { runDomainEventHandler } from '@/lib/events/handlers/registry';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('domain event dispatcher', () => {
  it('claims, handles, and completes each leased delivery once', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: [{ id: 'delivery-1', domain_event_id: 'event-1', handler_name: 'caseProjection' }], error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const client = {
      rpc,
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: {
          id: 'event-1', merchant_id: 'merchant-1', event_type: 'case.updated', aggregate_type: 'case', aggregate_id: 'case-1',
          payload: {}, occurred_at: '2026-01-01T00:00:00.000Z', recorded_at: '2026-01-01T00:00:00.000Z',
        }, error: null }),
      })),
    };

    await expect(runDomainEventHandler(client as unknown as SupabaseClient, 'caseProjection')).resolves.toEqual({ processed: 1, failed: 0 });
    expect(rpc).toHaveBeenCalledWith('complete_domain_event_delivery', { p_delivery_id: 'delivery-1' });
  });
});
