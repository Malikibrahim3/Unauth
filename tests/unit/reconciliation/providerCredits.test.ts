import type { SupabaseClient } from '@supabase/supabase-js';
import { recordProviderCredit, matchProviderCredit } from '@/lib/reconciliation/providerCredits';
import { TABLES } from '@/lib/supabase/tables';
import { createMemoryClient } from '@/tests/lib/supabaseMemoryClient';

describe('provider credit reconciliation', () => {
  it('records a matched provider credit as recovered once', async () => {
    const client = createMemoryClient();
    const recorded = await recordProviderCredit(client as unknown as SupabaseClient, 'merchant-1', {
      provider: 'shipbob',
      externalCreditId: 'credit-1',
      amountMinor: 4200,
      currency: 'GBP',
      recoveryCaseId: 'recovery-1',
      supportPayoutCaseId: 'case-1',
      idempotencyKey: 'provider-credit:1',
    });

    const firstMatch = await matchProviderCredit(
      client as unknown as SupabaseClient,
      'merchant-1',
      recorded.credit.id,
      { matchStatus: 'matched', matchedBy: 'user-1' },
    );
    const secondMatch = await matchProviderCredit(
      client as unknown as SupabaseClient,
      'merchant-1',
      recorded.credit.id,
      { matchStatus: 'matched', matchedBy: 'user-1' },
    );

    expect(firstMatch?.financialEntry).toMatchObject({
      ledger_kind: 'provider_recovery',
      amount_minor: 4200,
      direction: 'credit',
    });
    expect(secondMatch?.financialEntry).toMatchObject({ id: firstMatch?.financialEntry?.id });
    expect(client.__store.get(TABLES.CASE_FINANCIAL_ENTRIES)).toHaveLength(1);
  });

  it('does not silently retract a credit that has already been reconciled', async () => {
    const client = createMemoryClient();
    const recorded = await recordProviderCredit(client as unknown as SupabaseClient, 'merchant-1', {
      provider: 'ups',
      externalCreditId: 'credit-2',
      amountMinor: 1000,
      currency: 'GBP',
      recoveryCaseId: 'recovery-1',
      supportPayoutCaseId: 'case-1',
      idempotencyKey: 'provider-credit:2',
    });
    await matchProviderCredit(client as unknown as SupabaseClient, 'merchant-1', recorded.credit.id, {
      matchStatus: 'matched',
    });

    await expect(matchProviderCredit(client as unknown as SupabaseClient, 'merchant-1', recorded.credit.id, {
      matchStatus: 'rejected',
    })).rejects.toThrow('provider_credit_match_cannot_be_retracted_without_an_adjustment');
  });
});
