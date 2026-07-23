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
  payload: { action: 'refund', amount_minor: 2500, currency: 'gbp', decision_id: 'decision-1' },
  occurred_at: '2026-07-11T12:00:00.000Z',
  recorded_at: '2026-07-11T12:00:01.000Z',
};

describe('cross-module financial integrity', () => {
  it('keeps authorization separate, then projects verified payout and loss once', async () => {
    const memory = createMemoryClient();
    const client = memory as unknown as SupabaseClient;

    await financialProjection(client, event);
    await financialProjection(client, event);
    await lossProjection(client, event);

    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES)).toHaveLength(1);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_SUMMARIES)[0]).toMatchObject({
      currency: 'GBP', approved_minor: 2500, paid_minor: 0, confirmed_loss_minor: 0,
    });
    expect(rowsOf(memory, TABLES.LOSS_CASES)).toHaveLength(0);

    const sourceOutcome: DomainEventRecord = {
      ...event,
      id: 'event-2',
      event_type: 'case.outcome_reconciled',
      payload: {
        action: 'refund',
        amount_minor: 2500,
        confirmed_loss_minor: 2500,
        currency: 'GBP',
        outcome_id: 'outcome-1',
        source_metadata: { loss_basis: 'payout_value' },
      },
    };
    await financialProjection(client, sourceOutcome);
    await financialProjection(client, sourceOutcome);
    await lossProjection(client, sourceOutcome);
    await lossProjection(client, sourceOutcome);

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

  it('reverses an authorization by linkage and keeps the replacement decision', async () => {
    const memory = createMemoryClient();
    memory.__store.set(TABLES.DOMAIN_EVENTS, [{
      id: event.id,
      merchant_id: event.merchant_id,
      event_type: event.event_type,
      aggregate_id: event.aggregate_id,
      payload: event.payload,
    }]);
    const client = memory as unknown as SupabaseClient;
    await financialProjection(client, event);

    const correction: DomainEventRecord = {
      ...event,
      id: 'event-correction-1',
      payload: {
        action: 'refund', amount_minor: 1800, currency: 'GBP',
        decision_id: 'decision-2', reverses_decision_id: 'decision-1', reversal: true,
      },
    };
    await financialProjection(client, correction);
    await financialProjection(client, correction);

    const entries = rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES);
    expect(entries).toHaveLength(3);
    expect(entries.filter((row) => row.reverses_entry_id)).toHaveLength(1);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_SUMMARIES)[0]).toMatchObject({
      currency: 'GBP', approved_minor: 1800,
    });
  });

  it('retries a reordered decision reversal until the original projection exists', async () => {
    const memory = createMemoryClient();
    memory.__store.set(TABLES.DOMAIN_EVENTS, [{
      id: event.id,
      merchant_id: event.merchant_id,
      event_type: event.event_type,
      aggregate_id: event.aggregate_id,
      payload: event.payload,
    }]);
    const client = memory as unknown as SupabaseClient;
    const correction: DomainEventRecord = {
      ...event,
      id: 'event-correction-reordered',
      payload: {
        action: 'refund', amount_minor: 1800, currency: 'GBP',
        decision_id: 'decision-2', reverses_decision_id: 'decision-1', reversal: true,
      },
    };

    await expect(financialProjection(client, correction)).rejects.toThrow(
      'decision_reversal_waiting_for_prior_projection',
    );
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES)).toHaveLength(0);
    await financialProjection(client, event);
    await financialProjection(client, correction);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_SUMMARIES)[0]).toMatchObject({ approved_minor: 1800 });
  });

  it('reverses a verified source outcome without deleting its loss history', async () => {
    const memory = createMemoryClient();
    const sourceOutcome: DomainEventRecord = {
      ...event,
      id: 'source-outcome-original',
      event_type: 'case.outcome_reconciled',
      payload: {
        action: 'refund', amount_minor: 2500, confirmed_loss_minor: 2500,
        currency: 'GBP', outcome_id: 'outcome-original',
      },
    };
    memory.__store.set(TABLES.DOMAIN_EVENTS, [{
      id: sourceOutcome.id,
      merchant_id: sourceOutcome.merchant_id,
      event_type: sourceOutcome.event_type,
      aggregate_id: sourceOutcome.aggregate_id,
      payload: sourceOutcome.payload,
    }]);
    const client = memory as unknown as SupabaseClient;
    await financialProjection(client, sourceOutcome);
    await lossProjection(client, sourceOutcome);

    const reversal: DomainEventRecord = {
      ...sourceOutcome,
      id: 'source-outcome-reversal',
      payload: {
        ...sourceOutcome.payload,
        outcome_id: 'outcome-reversal',
        reversal: true,
        reverses_outcome_id: 'outcome-original',
      },
    };
    await financialProjection(client, reversal);
    await financialProjection(client, reversal);
    await lossProjection(client, reversal);

    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES)).toHaveLength(4);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_SUMMARIES)[0]).toMatchObject({
      paid_minor: 0, confirmed_loss_minor: 0,
    });
    expect(rowsOf(memory, TABLES.LOSS_CASES)).toHaveLength(1);
    expect(rowsOf(memory, TABLES.LOSS_CASES)[0]).toMatchObject({ financial_state: 'reversed' });
  });

  it('reverses matured prevention if a later source payout is observed', async () => {
    const memory = createMemoryClient();
    const client = memory as unknown as SupabaseClient;
    const prevention: DomainEventRecord = {
      ...event,
      id: 'prevention-1',
      event_type: 'case.prevention_confirmed',
      payload: { amount_minor: 2500, currency: 'GBP', observation_id: 'observation-1' },
    };
    await financialProjection(client, prevention);

    const laterPayout: DomainEventRecord = {
      ...event,
      id: 'late-payout-1',
      event_type: 'case.outcome_reconciled',
      payload: { action: 'refund', amount_minor: 2500, confirmed_loss_minor: 2500, currency: 'GBP' },
    };
    await financialProjection(client, laterPayout);
    await financialProjection(client, laterPayout);

    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES)).toHaveLength(4);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_SUMMARIES)[0]).toMatchObject({
      prevented_minor: 0, paid_minor: 2500, confirmed_loss_minor: 2500,
    });
  });

  it('does not treat recovery approval as cash and records received deltas once', async () => {
    const memory = createMemoryClient();
    const client = memory as unknown as SupabaseClient;
    const approval: DomainEventRecord = {
      ...event,
      id: 'recovery-approval-1',
      event_type: 'recovery.status_changed',
      payload: { amount_minor: 3000, currency: 'GBP', recovery_case_id: 'recovery-1' },
    };
    await financialProjection(client, approval);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES)).toHaveLength(0);

    const received: DomainEventRecord = {
      ...approval,
      id: 'recovery-received-1',
      event_type: 'recovery.completed',
      payload: { amount_minor: 1000, currency: 'GBP', recovery_case_id: 'recovery-1' },
    };
    await financialProjection(client, received);
    await financialProjection(client, received);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES)).toHaveLength(1);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_SUMMARIES)[0]).toMatchObject({ recovered_minor: 1000 });
  });

  it('creates one retrospective case and one source-outcome event for a refund replay', async () => {
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
    const outcomes = rowsOf(memory, TABLES.DOMAIN_EVENTS).filter((row) => row.event_type === 'case.outcome_reconciled');
    expect(outcomes).toHaveLength(1);
    expect(rowsOf(memory, TABLES.CASE_OUTCOMES)).toHaveLength(1);
  });
});
