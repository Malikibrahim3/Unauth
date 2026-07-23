import type { SupabaseClient } from '@supabase/supabase-js';
import { auditTimelineProjection } from '@/lib/events/handlers/auditTimelineProjection';
import type { DomainEventRecord } from '@/lib/events/handlers/types';

const baseEvent: DomainEventRecord = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  merchant_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  event_type: 'audit.action_recorded',
  aggregate_type: 'claim',
  aggregate_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  actor_type: 'user',
  actor_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  correlation_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  idempotency_key: 'audit:case:decision:1',
  occurred_at: '2026-07-21T09:00:00.000Z',
  recorded_at: '2026-07-21T09:00:01.000Z',
  payload: {
    audit: {
      action: 'payout_decision_recorded',
      resource_type: 'claim',
      resource_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      actor_role: 'analyst',
      meaning: 'Payout decision recorded',
      effective_at: '2026-07-21T09:00:00.000Z',
      recorded_at: '2026-07-21T09:00:01.000Z',
      idempotency_reference: 'decision:case-1:v2',
      metadata: { details: { amount_minor: '1200', currency: 'GBP' } },
    },
  },
};

function projectionClient(error: { message: string } | null = null) {
  const upsert = jest.fn().mockResolvedValue({ error });
  return {
    client: { from: jest.fn(() => ({ upsert })) } as unknown as SupabaseClient,
    upsert,
  };
}

describe('audit timeline projection', () => {
  it('projects a user actor with exact merchant, object, correlation, and times', async () => {
    const { client, upsert } = projectionClient();
    await expect(auditTimelineProjection(client, baseEvent)).resolves.toEqual({ applied: true });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      merchant_id: baseEvent.merchant_id,
      domain_event_id: baseEvent.id,
      actor_user_id: baseEvent.actor_id,
      actor_type: 'user',
      actor_role: 'analyst',
      action: 'payout_decision_recorded',
      resource_type: 'claim',
      resource_id: baseEvent.aggregate_id,
      correlation_id: baseEvent.correlation_id,
      idempotency_reference: 'decision:case-1:v2',
      effective_at: baseEvent.occurred_at,
      recorded_at: baseEvent.recorded_at,
      meaning: 'Payout decision recorded',
    }), { onConflict: 'domain_event_id', ignoreDuplicates: true });
  });

  it('projects a system actor explicitly', async () => {
    const { client, upsert } = projectionClient();
    await auditTimelineProjection(client, {
      ...baseEvent,
      actor_type: 'system',
      actor_id: null,
      payload: { audit: { action: 'recovery_status_changed', metadata: {} } },
    });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      actor_user_id: null,
      actor_type: 'system',
      actor_role: 'system',
    }), expect.anything());
  });

  it('makes duplicate delivery one logical timeline row', async () => {
    const { client, upsert } = projectionClient();
    await auditTimelineProjection(client, baseEvent);
    await auditTimelineProjection(client, baseEvent);
    expect(upsert).toHaveBeenCalledTimes(2);
    for (const [, options] of upsert.mock.calls) {
      expect(options).toEqual({ onConflict: 'domain_event_id', ignoreDuplicates: true });
    }
  });

  it('throws on projection-store failure so the worker retries and can dead-letter', async () => {
    const { client } = projectionClient({ message: 'database unavailable' });
    await expect(auditTimelineProjection(client, baseEvent))
      .rejects.toThrow('audit_timeline_projection_failed: database unavailable');
  });

  it('does not project unrelated domain events', async () => {
    const { client, upsert } = projectionClient();
    await expect(auditTimelineProjection(client, { ...baseEvent, event_type: 'case.updated' }))
      .resolves.toEqual({ applied: false, detail: 'event_type_not_supported' });
    expect(upsert).not.toHaveBeenCalled();
  });
});
