-- Project actionable work from canonical payout and recovery states.
begin;

insert into public.work_tasks (
  merchant_id, support_payout_case_id, title, description, owner_role,
  due_at, priority, status, blocking_reason, source, source_metadata
)
select
  c.merchant_id,
  c.id,
  case
    when c.status in ('evidence_needed', 'awaiting_customer_evidence') then 'Collect missing customer evidence'
    when c.status = 'awaiting_carrier_response' then 'Review carrier response'
    when c.status = 'awaiting_3pl_response' then 'Review 3PL response'
    when c.status = 'awaiting_supplier_response' then 'Review supplier response'
    when c.status in ('ready_for_decision', 'manual_review') then 'Record payout decision'
    else 'Review payout case'
  end,
  coalesce(c.next_action_reason, c.next_action, 'Open the case, verify the evidence, and record the next merchant action.'),
  case when c.status in ('ready_for_decision', 'manual_review') then 'merchant_decision_maker' else 'support_ops' end,
  coalesce(c.submitted_at, c.created_at) + case
    when c.status in ('ready_for_decision', 'manual_review') then interval '1 day'
    when c.status in ('evidence_needed', 'awaiting_customer_evidence') then interval '2 days'
    else interval '3 days'
  end,
  case
    when coalesce(c.submitted_at, c.created_at) < now() - interval '7 days' then 'urgent'
    when c.status in ('ready_for_decision', 'manual_review') then 'high'
    else 'medium'
  end,
  case when c.status in ('evidence_needed', 'awaiting_customer_evidence') then 'blocked' else 'open' end,
  case when c.status in ('evidence_needed', 'awaiting_customer_evidence') then 'Customer evidence required' end,
  'case_projection',
  jsonb_build_object('migration_key', 'case-work:' || c.id, 'case_status', c.status)
from public.support_payout_cases c
where c.status in (
  'new', 'evidence_needed', 'awaiting_customer_evidence',
  'awaiting_carrier_response', 'awaiting_3pl_response',
  'awaiting_supplier_response', 'ready_for_decision', 'manual_review',
  'pending', 'open', 'escalated'
)
on conflict do nothing;

insert into public.work_tasks (
  merchant_id, support_payout_case_id, loss_case_id, recovery_case_id,
  title, description, owner_role, due_at, priority, status,
  blocking_reason, source, source_metadata
)
select
  r.merchant_id,
  r.support_payout_case_id,
  r.loss_case_id,
  r.id,
  case
    when r.status = 'evidence_needed' then 'Complete recovery evidence'
    when r.status = 'ready_to_submit' then 'Submit recovery claim'
    when r.status = 'chase_due' then 'Chase recovery counterparty'
    when r.status in ('approved', 'partially_approved') then 'Reconcile recovery receipt'
    else 'Review recovery case'
  end,
  'Keep the recovery lifecycle, evidence, correspondence, and financial outcome current.',
  coalesce(r.owner_type::text, 'merchant_ops'),
  coalesce(r.next_chase_at, r.deadline_at, r.created_at + interval '3 days'),
  case when coalesce(r.next_chase_at, r.deadline_at) < now() then 'urgent' else 'high' end,
  case when r.status = 'evidence_needed' then 'blocked' else 'open' end,
  case when r.status = 'evidence_needed' then 'Recovery evidence required' end,
  'recovery_projection',
  jsonb_build_object('migration_key', 'recovery-work:' || r.id, 'recovery_status', r.status)
from public.recovery_cases r
where r.status not in ('paid', 'closed_unrecoverable', 'rejected')
on conflict do nothing;

commit;
