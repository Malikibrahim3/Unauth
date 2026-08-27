import type { SupabaseClient } from '@supabase/supabase-js';
import { loadCanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';

describe('MR4 canonical financial aggregate', () => {
  it('keeps currencies separated and preserves exact case counts', async () => {
    const client = { rpc: async () => ({ data: { currencies: [
      { currency: 'GBP', case_count: 101, known_states: ['confirmed_loss'], case_counts_by_state: { confirmed_loss: 101 }, confirmed_loss_minor: 5050 },
      { currency: 'USD', case_count: 2, known_states: ['recovered'], case_counts_by_state: { recovered: 2 }, recovered_minor: 900 },
    ] }, error: null }) } as unknown as SupabaseClient;
    const result = await loadCanonicalFinancialAggregate(client, 'merchant-1');
    expect(result.source).toBe('canonical');
    expect(result.mixedCurrencyPolicy).toBe('separated');
    expect(result.currencies).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: 'GBP', caseCount: 101, confirmedLossMinor: 5050 }),
      expect.objectContaining({ currency: 'USD', caseCount: 2, recoveredMinor: 900 }),
    ]));
  });

  it('marks missing schema unavailable rather than returning a verified zero', async () => {
    const client = { rpc: async () => ({ data: null, error: { message: 'function unavailable' } }) } as unknown as SupabaseClient;
    const result = await loadCanonicalFinancialAggregate(client, 'merchant-1');
    expect(result.source).toBe('unavailable');
    expect(result.currencies).toEqual([]);
    expect(result.unknownPolicy).toBe('withheld_not_zero');
  });
});
