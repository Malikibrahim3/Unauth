import { getCaseReadModel } from '@/lib/cases/readModel';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createMemoryClient, rowsOf } from '@/tests/lib/supabaseMemoryClient';
import { TABLES } from '@/lib/supabase/tables';

describe('case read model', () => {
  it('is side-effect free when loaded repeatedly', async () => {
    const client = createMemoryClient();
    client.__store.set(TABLES.MERCHANT_CLAIMS, [{
      id: 'case-1', merchant_id: 'merchant-1', status: 'open', state_version: 1,
      payout_decision_state: 'undecided', recovery_state: 'no_recovery_needed', updated_at: '2026-01-01T00:00:00.000Z',
    }]);
    const beforeCase = JSON.stringify(rowsOf(client, TABLES.MERCHANT_CLAIMS));

    const typedClient = client as unknown as SupabaseClient;
    await getCaseReadModel(typedClient, 'merchant-1', 'case-1');
    await getCaseReadModel(typedClient, 'merchant-1', 'case-1');

    expect(JSON.stringify(rowsOf(client, TABLES.MERCHANT_CLAIMS))).toBe(beforeCase);
    expect(rowsOf(client, TABLES.DOMAIN_EVENTS)).toHaveLength(0);
    expect(rowsOf(client, 'claim_events')).toHaveLength(0);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)[0].state_version).toBe(1);
  });
});
