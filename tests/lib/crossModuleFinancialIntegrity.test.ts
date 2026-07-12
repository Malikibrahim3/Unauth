import type { SupabaseClient } from '@supabase/supabase-js';
import { financialProjection } from '@/lib/events/handlers/financialProjection';
import { lossProjection } from '@/lib/events/handlers/lossProjection';
import { refundProjection } from '@/lib/events/handlers/refundProjection';
import type { DomainEventRecord } from '@/lib/events/handlers/types';
import { TABLES } from '@/lib/supabase/tables';
import { createMemoryClient, rowsOf } from '@/tests/lib/supabaseMemoryClient';

const event: DomainEventRecord = {
  id: 'event-1',
  merchant_id: 'merchant-1',
  event_type: 'case.decision_recorded',
  aggregate_type: 'case',
  aggregate_id: 'case-1',
  payload: { action: 'refund', amount_minor: 2500, currency: 'gbp' },
  occurred_at: '2026-07-11T12:00:00.000Z',
  recorded_at: '2026-07-11T12:00:01.000Z',
};

describe('cross-module financial integrity', () => {
  it('projects paid value and confirmed loss once when replayed', async () => {
    const memory = createMemoryClient();
    const client = memory as unknown as SupabaseClient;

    await financialProjection(client, event);
    await financialProjection(client, event);
    await lossProjection(client, event);
    await lossProjection(client, event);

    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES)).toHaveLength(3);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_SUMMARIES)[0]).toMatchObject({
      currency: 'GBP', approved_minor: 2500, paid_minor: 2500, confirmed_loss_minor: 2500,
    });
    expect(rowsOf(memory, TABLES.LOSS_CASES)).toHaveLength(1);
    expect(rowsOf(memory, TABLES.LOSS_CASES)[0]).toMatchObject({
      support_payout_case_id: 'case-1', refund_value_minor: 2500, currency: 'GBP',
    });
  });

  it('never combines currencies in one summary', async () => {
    const memory = createMemoryClient();
    const client = memory as unknown as SupabaseClient;
    await financialProjection(client, event);
    await financialProjection(client, {
      ...event,
      id: 'event-2',
      payload: { action: 'refund', amount_minor: 1800, currency: 'USD' },
    });
    const summaries = rowsOf(memory, TABLES.CASE_FINANCIAL_SUMMARIES);
    expect(summaries).toHaveLength(2);
    expect(summaries.map((row) => row.currency).sort()).toEqual(['GBP', 'USD']);
  });

  it('creates one retrospective case and one decision event for a refund replay', async () => {
    const memory = createMemoryClient();
    const client = memory as unknown as SupabaseClient;
    const refundEvent: DomainEventRecord = {
      ...event,
      id: 'refund-event-1',
      event_type: 'refund.created',
      aggregate_type: 'refund',
      aggregate_id: null,
      payload: { source_order_id: 'order-1', amount_minor: 2500, currency: 'GBP', case_origin: 'connector' },
    };
    await refundProjection(client, refundEvent);
    await refundProjection(client, refundEvent);

    expect(rowsOf(memory, TABLES.MERCHANT_CLAIMS)).toHaveLength(1);
    expect(rowsOf(memory, TABLES.ENTITY_RELATIONSHIPS)).toHaveLength(1);
    const decisions = rowsOf(memory, TABLES.DOMAIN_EVENTS).filter((row) => row.event_type === 'case.decision_recorded');
    expect(decisions).toHaveLength(1);
  });
});
