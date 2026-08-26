import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export const PAYMENT_FACT_FAMILIES = [
  'payment', 'refund', 'dispute_debit', 'dispute_fee', 'credit', 'settlement',
] as const;
export type PaymentFactFamily = (typeof PAYMENT_FACT_FAMILIES)[number];

export type PaymentAuthorityFact = {
  id: string;
  family: PaymentFactFamily;
  provider: 'shopify_payments';
  sourceTable: string;
  sourceExternalId: string;
  sourceRecordId: string | null;
  amountMinor: number;
  currency: string;
  sourceStatus: string | null;
  occurredAt: string | null;
  observedAt: string;
  sourceEvidence: 'source_record' | 'canonical_provider_row';
};

export type PaymentFamilyCoverage = {
  family: PaymentFactFamily;
  state: 'available' | 'partial' | 'unavailable';
  recordCount: number | null;
  latestObservedAt: string | null;
  reason: string | null;
};

export type PaymentAuthorityReadModel = {
  provider: 'shopify_payments';
  facts: PaymentAuthorityFact[];
  coverage: PaymentFamilyCoverage[];
  currencies: string[];
  mixedCurrency: boolean;
  complete: boolean;
  limitations: string[];
};

function currency(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : null;
}

function minorFromMajor(value: unknown): number | null {
  if (value == null || value === '') return null;
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const amount = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  return Number.isSafeInteger(amount) ? amount : null;
}

function transactionFamily(value: unknown): PaymentFactFamily | null {
  const kind = typeof value === 'string' ? value.toLowerCase() : '';
  if (/(fee)/.test(kind)) return 'dispute_fee';
  if (/(payout|settlement)/.test(kind)) return 'settlement';
  if (/(credit|adjustment|reversal)/.test(kind)) return 'credit';
  if (/(refund)/.test(kind)) return 'refund';
  if (/(dispute|chargeback|debit)/.test(kind)) return 'dispute_debit';
  if (/(capture|sale|payment|authorization)/.test(kind)) return 'payment';
  return null;
}

/** Read-only Shopify Payments projection. Absent families stay unavailable;
 * an empty query is not evidence of a verified zero. */
export async function loadShopifyPaymentsReadModel(
  client: SupabaseClient,
  merchantId: string,
): Promise<PaymentAuthorityReadModel> {
  const [payments, transactions, refunds, disputes] = await Promise.all([
    client.from(TABLES.SOURCE_PAYMENTS).select('id,external_id,source_record_id,status,source_status,amount_minor,currency,captured_at,updated_at', { count: 'exact' }).eq('merchant_id', merchantId).order('updated_at', { ascending: false }).limit(5000),
    client.from(TABLES.SOURCE_TRANSACTIONS).select('id,external_id,source_record_id,transaction_type,status,source_status,amount_minor,currency,occurred_at,updated_at', { count: 'exact' }).eq('merchant_id', merchantId).order('updated_at', { ascending: false }).limit(5000),
    client.from(TABLES.SOURCE_REFUNDS).select('id,external_id,amount,currency,refunded_at,ingested_at', { count: 'exact' }).eq('merchant_id', merchantId).order('ingested_at', { ascending: false }).limit(5000),
    client.from(TABLES.SOURCE_DISPUTES).select('id,external_id,amount,currency,status,initiated_at,finalized_at,ingested_at', { count: 'exact' }).eq('merchant_id', merchantId).order('ingested_at', { ascending: false }).limit(5000),
  ]);
  const limitations: string[] = [];
  const facts: PaymentAuthorityFact[] = [];
  const push = (fact: PaymentAuthorityFact | null) => { if (fact) facts.push(fact); };

  if (payments.error) limitations.push(`Payments unavailable: ${payments.error.message}`);
  else for (const row of payments.data ?? []) {
    const code = currency(row.currency);
    if (!code || !Number.isSafeInteger(row.amount_minor) || row.amount_minor < 0) continue;
    push({ id: `payment:${row.id}`, family: 'payment', provider: 'shopify_payments', sourceTable: TABLES.SOURCE_PAYMENTS, sourceExternalId: row.external_id, sourceRecordId: row.source_record_id, amountMinor: row.amount_minor, currency: code, sourceStatus: row.source_status ?? row.status, occurredAt: row.captured_at, observedAt: row.updated_at, sourceEvidence: row.source_record_id ? 'source_record' : 'canonical_provider_row' });
  }
  if (transactions.error) limitations.push(`Transactions unavailable: ${transactions.error.message}`);
  else for (const row of transactions.data ?? []) {
    const code = currency(row.currency);
    const family = transactionFamily(row.transaction_type);
    if (!family || !code || !Number.isSafeInteger(row.amount_minor) || row.amount_minor < 0) continue;
    push({ id: `transaction:${row.id}`, family, provider: 'shopify_payments', sourceTable: TABLES.SOURCE_TRANSACTIONS, sourceExternalId: row.external_id, sourceRecordId: row.source_record_id, amountMinor: row.amount_minor, currency: code, sourceStatus: row.source_status ?? row.status, occurredAt: row.occurred_at, observedAt: row.updated_at, sourceEvidence: row.source_record_id ? 'source_record' : 'canonical_provider_row' });
  }
  if (refunds.error) limitations.push(`Refunds unavailable: ${refunds.error.message}`);
  else for (const row of refunds.data ?? []) {
    const code = currency(row.currency);
    const amountMinor = minorFromMajor(row.amount);
    if (!code || amountMinor == null) continue;
    push({ id: `refund:${row.id}`, family: 'refund', provider: 'shopify_payments', sourceTable: TABLES.SOURCE_REFUNDS, sourceExternalId: row.external_id, sourceRecordId: null, amountMinor, currency: code, sourceStatus: null, occurredAt: row.refunded_at, observedAt: row.ingested_at, sourceEvidence: 'canonical_provider_row' });
  }
  if (disputes.error) limitations.push(`Disputes unavailable: ${disputes.error.message}`);
  else for (const row of disputes.data ?? []) {
    const code = currency(row.currency);
    const amountMinor = minorFromMajor(row.amount);
    if (!code || amountMinor == null) continue;
    push({ id: `dispute:${row.id}`, family: 'dispute_debit', provider: 'shopify_payments', sourceTable: TABLES.SOURCE_DISPUTES, sourceExternalId: row.external_id, sourceRecordId: null, amountMinor, currency: code, sourceStatus: row.status, occurredAt: row.finalized_at ?? row.initiated_at, observedAt: row.ingested_at, sourceEvidence: 'canonical_provider_row' });
  }

  const cappedSources = new Set<string>();
  for (const [name, result] of Object.entries({ payments, transactions, refunds, disputes })) {
    if (result.count != null && result.count > (result.data?.length ?? 0)) cappedSources.add(name);
  }
  const familySources: Record<PaymentFactFamily, string[]> = {
    payment: ['payments', 'transactions'],
    refund: ['refunds', 'transactions'],
    dispute_debit: ['disputes', 'transactions'],
    dispute_fee: ['transactions'],
    credit: ['transactions'],
    settlement: ['transactions'],
  };
  const coverage = PAYMENT_FACT_FAMILIES.map((family): PaymentFamilyCoverage => {
    const rows = facts.filter((fact) => fact.family === family);
    const partial = familySources[family].some((source) => cappedSources.has(source));
    if (rows.length > 0) return {
      family,
      state: partial ? 'partial' : 'available',
      recordCount: rows.length,
      latestObservedAt: rows.map((row) => row.observedAt).sort().at(-1) ?? null,
      reason: partial ? `The ${family.replaceAll('_', ' ')} projection reached its 5,000-row read bound; totals are withheld until the scope is narrowed.` : null,
    };
    return { family, state: 'unavailable', recordCount: null, latestObservedAt: null, reason: `No source-backed ${family.replaceAll('_', ' ')} facts are available in this merchant projection.` };
  });
  const currencies = [...new Set(facts.map((fact) => fact.currency))].sort();
  return {
    provider: 'shopify_payments',
    facts: facts.sort((left, right) => (right.occurredAt ?? right.observedAt).localeCompare(left.occurredAt ?? left.observedAt)),
    coverage,
    currencies,
    mixedCurrency: currencies.length > 1,
    complete: coverage.every((row) => row.state === 'available') && limitations.length === 0,
    limitations: [...limitations, ...coverage.filter((row) => row.state !== 'available').map((row) => row.reason!).filter(Boolean)],
  };
}
