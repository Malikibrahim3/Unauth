import type { SupabaseClient } from '@supabase/supabase-js';
import { recordProviderCredit, transitionProviderCredit } from '@/lib/reconciliation/providerCredits';

describe('MR4 provider credit reconciliation', () => {
  it('records receipt-backed observation without creating received value', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const client = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { data: { credit: { id: 'credit-1', reconciliation_status: 'unmatched' }, event: { event_type: 'observed' }, replayed: false }, error: null };
      },
    } as unknown as SupabaseClient;

    const result = await recordProviderCredit(client, 'merchant-1', {
      provider: 'shipbob', externalCreditId: 'credit-1', amountMinor: 4200, currency: 'gbp',
      observationAuthority: 'receipt_backed_manual', evidenceItemId: '11111111-1111-4111-8111-111111111111',
      recoveryCaseId: 'recovery-1', supportPayoutCaseId: 'case-1', actorUserId: 'user-1',
      reason: 'Credit receipt attached', idempotencyKey: 'provider-credit:1',
    });

    expect(result.credit).toMatchObject({ reconciliation_status: 'unmatched' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      name: 'record_provider_credit_v1',
      args: { p_observation_authority: 'receipt_backed_manual', p_currency: 'GBP', p_amount_minor: 4200 },
    });
  });

  it('keeps match and reconciliation as separate versioned events', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const client = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        const action = String(args.p_action);
        return { data: {
          credit: { id: 'credit-1', reconciliation_status: action === 'matched' ? 'received_unreconciled' : 'reconciled' },
          recovery_case: { id: 'recovery-1' }, event: { event_type: action }, replayed: false,
        }, error: null };
      },
    } as unknown as SupabaseClient;

    const matched = await transitionProviderCredit(client, 'merchant-1', 'recovery-1', 'credit-1', {
      action: 'matched', expectedVersion: 0, matchMethod: 'external claim reference', matchConfidence: 1,
      actorUserId: 'user-1', reason: 'Receipt and claim reference agree', idempotencyKey: 'credit-match:1',
    });
    const reconciled = await transitionProviderCredit(client, 'merchant-1', 'recovery-1', 'credit-1', {
      action: 'reconciled', expectedVersion: 1, actorUserId: 'user-1',
      reason: 'Ledger entry checked', idempotencyKey: 'credit-reconcile:1',
    });

    expect(matched.credit).toMatchObject({ reconciliation_status: 'received_unreconciled' });
    expect(reconciled.credit).toMatchObject({ reconciliation_status: 'reconciled' });
    expect(calls.map((call) => call.args.p_action)).toEqual(['matched', 'reconciled']);
    expect(calls.map((call) => call.args.p_expected_version)).toEqual([0, 1]);
  });

  it('does not hide RPC version conflicts', async () => {
    const client = { rpc: async () => ({ data: null, error: { message: 'provider_credit_version_conflict' } }) } as unknown as SupabaseClient;
    await expect(transitionProviderCredit(client, 'merchant-1', 'recovery-1', 'credit-1', {
      action: 'matched', expectedVersion: 7, matchMethod: 'receipt', actorUserId: 'user-1',
      reason: 'Reviewed receipt', idempotencyKey: 'credit-match:conflict',
    })).rejects.toThrow('provider_credit_version_conflict');
  });
});
