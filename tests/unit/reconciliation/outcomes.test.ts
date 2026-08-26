import type { SupabaseClient } from '@supabase/supabase-js';
import {
  recordCaseOutcome,
  validateMerchantRecordedOutcomeEvidence,
} from '@/lib/reconciliation/outcomes';
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
      sourceSystem: 'merchant_receipt',
      sourceExternalId: 'receipt-123',
      correlationMethod: 'receipt_backed_manual_record',
      overrideReason: 'Checked the provider receipt in the merchant portal.',
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

  it('rejects merchant attempts to manufacture source-observed or receipt-free completion states', () => {
    expect(validateMerchantRecordedOutcomeEvidence({
      state: 'observed_success',
      sourceSystem: 'merchant_manual',
      overrideReason: 'Merchant says the refund completed.',
    })).toContain('source-ingestion lifecycle');

    expect(validateMerchantRecordedOutcomeEvidence({
      state: 'merchant_confirmed',
      sourceSystem: 'merchant_receipt',
      correlationMethod: 'receipt_backed_manual_record',
      overrideReason: 'Checked the provider portal.',
    })).toContain('receipt or provider reference');

    expect(validateMerchantRecordedOutcomeEvidence({
      state: 'reported',
      sourceSystem: 'merchant_report',
      correlationMethod: 'merchant_reported_external_state',
      overrideReason: 'Merchant reports the external action is awaiting verification.',
    })).toBeNull();
  });
});
