-- Pre-payout investigation workflow for support payout cases.
--
-- Adds explicit payout workflow state, separates payout decision/recovery state
-- in persisted columns, and creates clarification tasks that happen before a
-- customer payout decision. Recovery cases remain separate and post-decision.

begin;

alter type public.claim_status add value if not exists 'new';
alter type public.claim_status add value if not exists 'evidence_needed';
alter type public.claim_status add value if not exists 'awaiting_customer_evidence';
alter type public.claim_status add value if not exists 'awaiting_carrier_response';
alter type public.claim_status add value if not exists 'awaiting_3pl_response';
alter type public.claim_status add value if not exists 'awaiting_supplier_response';
alter type public.claim_status add value if not exists 'ready_for_decision';
alter type public.claim_status add value if not exists 'manual_review';
alter type public.claim_status add value if not exists 'decision_recorded';
alter type public.claim_status add value if not exists 'recovery_opened';
alter type public.claim_status add value if not exists 'closed';

alter table public.support_payout_cases
  add column if not exists payout_decision_state text not null default 'undecided',
  add column if not exists recovery_state text not null default 'no_recovery_needed',
  add column if not exists next_action text,
  add column if not exists next_action_reason text;

create index if not exists idx_support_payout_cases_next_action
  on public.support_payout_cases (merchant_id, next_action)
  where next_action is not null;
create index if not exists idx_support_payout_cases_payout_decision_state
  on public.support_payout_cases (merchant_id, payout_decision_state);
create index if not exists idx_support_payout_cases_recovery_state
  on public.support_payout_cases (merchant_id, recovery_state);

create table if not exists public.case_clarification_requests (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  target_type text not null check (target_type in ('carrier','3pl','supplier','customer','internal')),
  target_name text,
  status text not null default 'draft' check (status in ('draft','sent','waiting_response','response_received','closed')),
  requested_evidence text[] not null default '{}',
  request_summary text not null,
  response_summary text,
  source_channel text check (source_channel in ('email','api','manual','gorgias')),
  due_at timestamptz,
  sent_at timestamptz,
  response_received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_case_clarification_requests_case
  on public.case_clarification_requests (support_payout_case_id, created_at desc);
create index if not exists idx_case_clarification_requests_merchant_status
  on public.case_clarification_requests (merchant_id, status, due_at);
create index if not exists idx_case_clarification_requests_target
  on public.case_clarification_requests (merchant_id, target_type, status);

drop trigger if exists trg_case_clarification_requests_updated on public.case_clarification_requests;
create trigger trg_case_clarification_requests_updated before update on public.case_clarification_requests
  for each row execute function public.set_updated_at();

alter table public.case_clarification_requests enable row level security;

drop policy if exists case_clarification_requests_member_select on public.case_clarification_requests;
create policy case_clarification_requests_member_select on public.case_clarification_requests
  for select using (
    exists (
      select 1 from public.merchant_users mu
      where mu.merchant_id = case_clarification_requests.merchant_id
        and mu.user_id = auth.uid()
    )
  );

drop policy if exists case_clarification_requests_member_insert on public.case_clarification_requests;
create policy case_clarification_requests_member_insert on public.case_clarification_requests
  for insert with check (
    exists (
      select 1 from public.merchant_users mu
      where mu.merchant_id = case_clarification_requests.merchant_id
        and mu.user_id = auth.uid()
    )
  );

drop policy if exists case_clarification_requests_member_update on public.case_clarification_requests;
create policy case_clarification_requests_member_update on public.case_clarification_requests
  for update using (
    exists (
      select 1 from public.merchant_users mu
      where mu.merchant_id = case_clarification_requests.merchant_id
        and mu.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.merchant_users mu
      where mu.merchant_id = case_clarification_requests.merchant_id
        and mu.user_id = auth.uid()
    )
  );

grant all on public.case_clarification_requests to service_role;
grant select, insert, update on public.case_clarification_requests to authenticated;

comment on table public.case_clarification_requests is
  'Pre-payout clarification tasks for support payout cases. Separate from recovery cases.';
comment on column public.support_payout_cases.payout_decision_state is
  'Customer payout decision axis, separate from recovery state.';
comment on column public.support_payout_cases.recovery_state is
  'Recovery lifecycle axis, separate from customer payout decision state.';
comment on column public.support_payout_cases.next_action is
  'Operational next action for the support payout case.';

notify pgrst, 'reload schema';

commit;
