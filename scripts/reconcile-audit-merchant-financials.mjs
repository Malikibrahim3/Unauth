import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const merchantId = process.env.E2E_MERCHANT_ID;
const apply = process.argv.includes('--apply');

if (!url || !serviceRoleKey || !merchantId) {
  throw new Error('Supabase service configuration and E2E_MERCHANT_ID are required');
}

const client = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const routeFor = (type) => ({
  carrier_claim: 'carrier_claim',
  three_pl_claim: '3pl_claim',
  chargeback_evidence: 'chargeback_evidence_pack',
  returns_provider_claim: 'returns_platform_claim',
  supplier_defect: 'supplier_vendor_claim',
  warehouse_error: 'internal_fulfilment_issue',
  packaging_issue: 'internal_fulfilment_issue',
  internal_policy_fix: 'internal_fulfilment_issue',
}[type] ?? 'needs_more_evidence');

const categoryFor = (type) => ({
  carrier_claim: 'delivery_loss',
  chargeback_evidence: 'chargeback_or_payment_dispute',
  returns_provider_claim: 'returns_abuse_or_exception',
  warehouse_error: 'fulfilment_or_warehouse_error',
  three_pl_claim: 'fulfilment_or_warehouse_error',
  supplier_defect: 'supplier_or_vendor_issue',
  packaging_issue: 'supplier_or_vendor_issue',
}[type] ?? 'unknown_post_purchase_loss');

const counterpartyFor = (owner) => ({
  carrier: 'carrier',
  three_pl: '3pl',
  warehouse: 'warehouse',
  supplier: 'supplier',
  returns_provider: 'returns_provider',
  payment_dispute_provider: 'payment_processor',
  merchant_support: 'internal_team',
  merchant_ops: 'internal_team',
  merchant_finance: 'internal_team',
}[owner] ?? 'unknown');

const statusFor = (status) => ({
  submitted: 'submitted',
  approved: 'approved',
  paid: 'approved',
  partially_approved: 'partially_approved',
  rejected: 'denied',
  closed_unrecoverable: 'closed_unrecoverable',
  evidence_needed: 'collecting_evidence',
  draft: 'collecting_evidence',
}[status] ?? 'detected');

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function soughtAmount(recovery) {
  return Math.max(
    finiteNumber(
      recovery.estimated_recoverable_max
        ?? recovery.eligible_loss_amount
        ?? recovery.merchant_loss_amount,
    ),
    finiteNumber(recovery.amount_recovered),
  );
}

async function rebuildSummary(caseId) {
  const { data: entries, error } = await client
    .from('case_financial_entries')
    .select('id,state,amount_minor,currency,effective_at,created_at')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId);
  if (error) throw error;

  const byCurrency = new Map();
  for (const entry of entries ?? []) {
    const currency = String(entry.currency ?? '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency) || currency === 'XXX') continue;
    const summary = byCurrency.get(currency) ?? {
      merchant_id: merchantId,
      support_payout_case_id: caseId,
      currency,
      requested_minor: 0,
      exposed_minor: 0,
      approved_minor: 0,
      paid_minor: 0,
      estimated_loss_minor: 0,
      confirmed_loss_minor: 0,
      recoverable_minor: 0,
      recovered_minor: 0,
      prevented_minor: 0,
      written_off_minor: 0,
      last_event_id: null,
      updated_at: new Date().toISOString(),
    };
    const key = `${entry.state}_minor`;
    if (key in summary) summary[key] += finiteNumber(entry.amount_minor);
    summary.last_event_id = entry.id;
    byCurrency.set(currency, summary);
  }

  for (const summary of byCurrency.values()) {
    const { error: upsertError } = await client
      .from('case_financial_summaries')
      .upsert(summary, { onConflict: 'merchant_id,support_payout_case_id,currency' });
    if (upsertError) throw upsertError;
  }
}

const { data: orphanRows, error: orphanError } = await client
  .from('recovery_cases')
  .select('id,merchant_id,support_payout_case_id,loss_case_id,prevention_only,recovery_type,owner_type,status,merchant_loss_amount,eligible_loss_amount,estimated_recoverable_max,amount_recovered,currency,created_at')
  .eq('merchant_id', merchantId)
  .is('loss_case_id', null)
  .eq('prevention_only', false)
  .gt('merchant_loss_amount', 0);
if (orphanError) throw orphanError;

if (!apply) {
  process.stdout.write(`${JSON.stringify({ mode: 'dry-run', merchantId, orphanRecoveries: orphanRows?.length ?? 0 })}\n`);
  process.exit(0);
}

let lossesCreated = 0;
let recoveriesLinked = 0;
let financialEntriesCreated = 0;
const affectedCases = new Set();

for (const recovery of orphanRows ?? []) {
  const fingerprint = `recovery_cases:${recovery.id}`;
  let { data: loss } = await client
    .from('loss_cases')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('source_fingerprint', fingerprint)
    .maybeSingle();

  if (!loss) {
    const { data: inserted, error } = await client
      .from('loss_cases')
      .insert({
        merchant_id: merchantId,
        support_payout_case_id: recovery.support_payout_case_id,
        case_category: categoryFor(recovery.recovery_type),
        case_type: recovery.recovery_type,
        recovery_route: routeFor(recovery.recovery_type),
        status: statusFor(recovery.status),
        counterparty_type: counterpartyFor(recovery.owner_type),
        estimated_recovery_minor: Math.round(soughtAmount(recovery) * 100),
        currency: String(recovery.currency).toUpperCase(),
        source_confidence: 'source_verified',
        source_fingerprint: fingerprint,
        financial_state: 'confirmed',
        attribution: recovery.recovery_type,
        recoverability: recovery.status === 'closed_unrecoverable' ? 'not_recoverable' : 'recoverable',
        confirmed_at: recovery.created_at,
        source_metadata: {
          origin: 'recovery_case',
          recovery_case_id: recovery.id,
          merchant_loss_amount: finiteNumber(recovery.merchant_loss_amount),
        },
      })
      .select('id')
      .single();
    if (error) throw error;
    loss = inserted;
    lossesCreated += 1;
  }

  const { error: linkError } = await client
    .from('recovery_cases')
    .update({ loss_case_id: loss.id })
    .eq('merchant_id', merchantId)
    .eq('id', recovery.id)
    .is('loss_case_id', null);
  if (linkError) throw linkError;
  recoveriesLinked += 1;

  const migrationKey = `reconciliation:recovery:confirmed_loss:${recovery.id}`;
  const { data: existingEntry, error: lookupError } = await client
    .from('case_financial_entries')
    .select('id')
    .eq('merchant_id', merchantId)
    .contains('metadata', { migration_key: migrationKey })
    .maybeSingle();
  if (lookupError) throw lookupError;
  const currency = String(recovery.currency ?? '').toUpperCase();
  if (!existingEntry && /^[A-Z]{3}$/.test(currency) && currency !== 'XXX') {
    const { error: entryError } = await client.from('case_financial_entries').insert({
      merchant_id: merchantId,
      support_payout_case_id: recovery.support_payout_case_id,
      recovery_case_id: recovery.id,
      state: 'confirmed_loss',
      amount_minor: Math.round(finiteNumber(recovery.merchant_loss_amount) * 100),
      currency,
      direction: 'debit',
      effective_at: recovery.created_at,
      metadata: { migration_key: migrationKey },
    });
    if (entryError) throw entryError;
    financialEntriesCreated += 1;
  }
  affectedCases.add(recovery.support_payout_case_id);
}

for (const caseId of affectedCases) await rebuildSummary(caseId);

process.stdout.write(`${JSON.stringify({
  mode: 'apply',
  merchantId,
  orphanRecoveries: orphanRows?.length ?? 0,
  lossesCreated,
  recoveriesLinked,
  financialEntriesCreated,
  summariesRebuilt: affectedCases.size,
})}\n`);
