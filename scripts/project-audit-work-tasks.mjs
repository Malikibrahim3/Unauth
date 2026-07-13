import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const merchantId = process.env.E2E_MERCHANT_ID;
if (!url || !key || !merchantId) throw new Error('Audit merchant service configuration is required');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: claims, error } = await client
  .from('support_payout_cases')
  .select('id,status,next_action,next_action_reason,submitted_at,created_at')
  .eq('merchant_id', merchantId)
  .in('status', ['new','evidence_needed','awaiting_customer_evidence','awaiting_carrier_response','awaiting_3pl_response','awaiting_supplier_response','ready_for_decision','manual_review','pending','open','escalated']);
if (error) throw error;

let created = 0;
for (const claim of claims ?? []) {
  const migrationKey = `case-work:${claim.id}`;
  const { data: existing } = await client.from('work_tasks').select('id').eq('merchant_id', merchantId).contains('source_metadata', { migration_key: migrationKey }).maybeSingle();
  if (existing) continue;
  const evidence = ['evidence_needed', 'awaiting_customer_evidence'].includes(claim.status);
  const decision = ['ready_for_decision', 'manual_review'].includes(claim.status);
  const base = new Date(claim.submitted_at ?? claim.created_at);
  base.setUTCDate(base.getUTCDate() + (decision ? 1 : evidence ? 2 : 3));
  const { error: insertError } = await client.from('work_tasks').insert({
    merchant_id: merchantId,
    support_payout_case_id: claim.id,
    title: evidence ? 'Collect missing customer evidence' : decision ? 'Record payout decision' : 'Review payout case',
    description: claim.next_action_reason ?? claim.next_action ?? 'Verify the case evidence and record the next merchant action.',
    owner_role: decision ? 'merchant_decision_maker' : 'support_ops',
    due_at: base.toISOString(),
    priority: base.getTime() < Date.now() ? 'urgent' : decision ? 'high' : 'medium',
    status: evidence ? 'blocked' : 'open',
    blocking_reason: evidence ? 'Customer evidence required' : null,
    source: 'case_projection',
    source_metadata: { migration_key: migrationKey, case_status: claim.status },
  });
  if (insertError) throw insertError;
  created += 1;
}

const { data: recoveries, error: recoveryError } = await client
  .from('recovery_cases')
  .select('id,support_payout_case_id,loss_case_id,status,owner_type,next_chase_at,deadline_at,created_at')
  .eq('merchant_id', merchantId)
  .not('status', 'in', '(paid,closed_unrecoverable,rejected)');
if (recoveryError) throw recoveryError;
for (const recovery of recoveries ?? []) {
  const migrationKey = `recovery-work:${recovery.id}`;
  const { data: existing } = await client.from('work_tasks').select('id').eq('merchant_id', merchantId).contains('source_metadata', { migration_key: migrationKey }).maybeSingle();
  if (existing) continue;
  const title = recovery.status === 'evidence_needed' ? 'Complete recovery evidence'
    : recovery.status === 'ready_to_submit' ? 'Submit recovery claim'
    : recovery.status === 'chase_due' ? 'Chase recovery counterparty'
    : 'Review recovery case';
  const { error: insertError } = await client.from('work_tasks').insert({
    merchant_id: merchantId,
    support_payout_case_id: recovery.support_payout_case_id,
    loss_case_id: recovery.loss_case_id,
    recovery_case_id: recovery.id,
    title,
    description: 'Keep evidence, correspondence, deadlines, and the financial outcome current.',
    owner_role: recovery.owner_type ?? 'merchant_ops',
    due_at: recovery.next_chase_at ?? recovery.deadline_at ?? recovery.created_at,
    priority: 'urgent',
    status: recovery.status === 'evidence_needed' ? 'blocked' : 'open',
    blocking_reason: recovery.status === 'evidence_needed' ? 'Recovery evidence required' : null,
    source: 'recovery_projection',
    source_metadata: { migration_key: migrationKey, recovery_status: recovery.status },
  });
  if (insertError) throw insertError;
  created += 1;
}

process.stdout.write(`${JSON.stringify({ merchantId, consideredCases: claims?.length ?? 0, consideredRecoveries: recoveries?.length ?? 0, created })}\n`);
