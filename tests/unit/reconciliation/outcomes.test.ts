import type { SupabaseClient } from '@supabase/supabase-js';
import { recordCaseOutcome } from '@/lib/reconciliation/outcomes';
import { TABLES } from '@/lib/supabase/tables';
import { createMemoryClient } from '@/tests/lib/supabaseMemoryClient';

function rows(client: ReturnType<typeof createMemoryClient>, table: string) {
  return client.__store.get(table) ?? [];
}

describe('recordCaseOutcome', () => {
  it('keeps a pending refund out of the customer-concession ledger', async () => {
    const client = createMemoryClient();
    const result = await recordCaseOutcome(client as unknown as SupabaseClient, 'merchant-1', 'case-1', {
      outcomeType: 'cash_refund',
      state: 'observed_pending',
      sourceSystem: 'shopify',
      amountMinor: 2500,
      currency: 'GBP',
      idempotencyKey: 'refund:pending:1',
    });

    expect(result.replayed).toBe(false);
    expect(rows(client, TABLES.CASE_OUTCOME_EVENTS)).toHaveLength(1);
    expect(rows(client, TABLES.CASE_FINANCIAL_ENTRIES)).toHaveLength(0);
  });

  it('records a realised customer concession once and replays idempotently', async () => {
    const client = createMemoryClient();
    const input = {
      outcomeType: 'replacement' as const,
      state: 'merchant_confirmed' as const,
      sourceSystem: 'merchant_manual',
      retailValueMinor: 1800,
      currency: 'GBP',
      idempotencyKey: 'replacement:1',
    };
    const first = await recordCaseOutcome(client as unknown as SupabaseClient, 'merchant-1', 'case-1', input);
    const second = await recordCaseOutcome(client as unknown as SupabaseClient, 'merchant-1', 'case-1', input);

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(rows(client, TABLES.CASE_OUTCOME_EVENTS)).toHaveLength(1);
    expect(rows(client, TABLES.CASE_FINANCIAL_ENTRIES)).toHaveLength(1);
    expect(rows(client, TABLES.CASE_FINANCIAL_ENTRIES)[0]).toMatchObject({
      ledger_kind: 'customer_concession',
      valuation_basis: 'retail_value',
    });
  });
});
