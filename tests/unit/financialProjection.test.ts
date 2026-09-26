import type { SupabaseClient } from '@supabase/supabase-js';
import { financialProjection } from '@/lib/events/handlers/financialProjection';
import type { DomainEventRecord } from '@/lib/events/handlers/types';
import { TABLES } from '@/lib/supabase/tables';
import { createMemoryClient, rowsOf } from '@/tests/lib/supabaseMemoryClient';

describe('P05 replacement financial projection', () => {
  it('records the explicit replacement budget as authorised only', async () => {
    const memory = createMemoryClient();
    const event: DomainEventRecord = {
      id: 'replacement-decision-1', merchant_id: 'merchant-1',
      event_type: 'case.decision_recorded', aggregate_type: 'case', aggregate_id: 'case-1',
      payload: { action: 'same_item_replacement', amount_minor: 2500, currency: 'GBP', decision_id: 'decision-1' },
      occurred_at: '2026-09-06T10:00:00.000Z', recorded_at: '2026-09-06T10:00:01.000Z',
    };
    await financialProjection(memory as unknown as SupabaseClient, event);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES)).toEqual([
      expect.objectContaining({ state: 'approved', amount_minor: 2500, currency: 'GBP', component_type: 'same_item_replacement' }),
    ]);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_SUMMARIES)[0]).toMatchObject({
      approved_minor: 2500, paid_minor: 0, confirmed_loss_minor: 0, recovered_minor: 0,
    });
  });

  it('does not infer a replacement from a historical generic approval', async () => {
    const memory = createMemoryClient();
    const event: DomainEventRecord = {
      id: 'historic-approval-1', merchant_id: 'merchant-1',
      event_type: 'case.decision_recorded', aggregate_type: 'case', aggregate_id: 'case-1',
      payload: { action: 'approved', amount_minor: 2500, currency: 'GBP', decision_id: 'decision-1' },
      occurred_at: '2026-09-06T10:00:00.000Z', recorded_at: '2026-09-06T10:00:01.000Z',
    };
    await financialProjection(memory as unknown as SupabaseClient, event);
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES)[0]).toMatchObject({ component_type: 'approved' });
    expect(rowsOf(memory, TABLES.CASE_FINANCIAL_ENTRIES)[0]).not.toMatchObject({ component_type: 'same_item_replacement' });
  });
});
