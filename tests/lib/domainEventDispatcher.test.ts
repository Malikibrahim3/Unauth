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

  it('records a projection failure for bounded retry, then completes the same delivery', async () => {
    const delivery = { id: 'delivery-audit-1', domain_event_id: 'event-audit-1', handler_name: 'auditTimelineProjection' };
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: [delivery], error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [delivery], error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const upsert = jest.fn()
      .mockResolvedValueOnce({ error: { message: 'temporary timeline failure' } })
      .mockResolvedValueOnce({ error: null });
    const event = {
      id: 'event-audit-1', merchant_id: 'merchant-1', event_type: 'audit.action_recorded',
      aggregate_type: 'claim', aggregate_id: 'case-1', actor_type: 'system', actor_id: null,
      correlation_id: 'correlation-1', idempotency_key: 'audit-1',
      payload: { audit: { action: 'recovery_status_changed', metadata: {} } },
      occurred_at: '2026-01-01T00:00:00.000Z', recorded_at: '2026-01-01T00:00:01.000Z',
    };
    const client = {
      rpc,
      from: jest.fn((table: string) => table === 'user_action_log'
        ? { upsert }
        : {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: event, error: null }),
          }),
    };

    await expect(runDomainEventHandler(client as unknown as SupabaseClient, 'auditTimelineProjection'))
      .resolves.toEqual({ processed: 0, failed: 1 });
    expect(rpc).toHaveBeenCalledWith('fail_domain_event_delivery', expect.objectContaining({
      p_delivery_id: delivery.id,
      p_error: expect.stringContaining('temporary timeline failure'),
    }));

    await expect(runDomainEventHandler(client as unknown as SupabaseClient, 'auditTimelineProjection'))
      .resolves.toEqual({ processed: 1, failed: 0 });
    expect(rpc).toHaveBeenCalledWith('complete_domain_event_delivery', { p_delivery_id: delivery.id });
  });
});
