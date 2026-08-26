-- Forward-only repair for live Cases read models that were present in the
-- reviewed release migrations but absent from the deployed schema.

alter table public.recovery_cases
  add column if not exists amount_sought_minor bigint,
  add column if not exists amount_approved_minor bigint not null default 0,
  add column if not exists amount_recovered_minor bigint not null default 0,
  add column if not exists amount_written_off_minor bigint not null default 0;

update public.recovery_cases
set
  amount_sought_minor = greatest(
    0,
    round(coalesce(estimated_recoverable_max, eligible_loss_amount, merchant_loss_amount, 0) * 100)::bigint,
    round(coalesce(amount_recovered, 0) * 100)::bigint
  ),
  amount_approved_minor = case
    when status in ('approved', 'partially_approved', 'paid') then greatest(
      round(coalesce(estimated_recoverable_max, eligible_loss_amount, merchant_loss_amount, 0) * 100)::bigint,
      round(coalesce(amount_recovered, 0) * 100)::bigint
    )
    else 0
  end,
  amount_recovered_minor = round(coalesce(amount_recovered, 0) * 100)::bigint,
  amount_written_off_minor = case
    when status = 'closed_unrecoverable' then greatest(
      round(coalesce(estimated_recoverable_max, eligible_loss_amount, merchant_loss_amount, 0) * 100)::bigint
        - round(coalesce(amount_recovered, 0) * 100)::bigint,
      0
    )
    else 0
  end;

alter table public.recovery_cases
  alter column amount_sought_minor set not null;

do $block$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recovery_cases_minor_amounts_nonnegative'
      and conrelid = 'public.recovery_cases'::regclass
  ) then
    alter table public.recovery_cases
      add constraint recovery_cases_minor_amounts_nonnegative check (
        amount_sought_minor >= 0
        and amount_approved_minor >= 0
        and amount_recovered_minor >= 0
        and amount_written_off_minor >= 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recovery_cases_minor_amounts_bounded'
      and conrelid = 'public.recovery_cases'::regclass
  ) then
    alter table public.recovery_cases
      add constraint recovery_cases_minor_amounts_bounded check (
        amount_approved_minor <= amount_sought_minor
        and amount_recovered_minor <= amount_sought_minor
        and amount_recovered_minor + amount_written_off_minor <= amount_sought_minor
      );
  end if;
end;
$block$;

alter table public.case_clarification_requests
  add column if not exists is_primary boolean not null default false,
  add column if not exists evidence_gap text,
  add column if not exists recommended_reason text,
  add column if not exists override_rationale text,
  add column if not exists subject text,
  add column if not exists request_body text,
  add column if not exists recipient text,
  add column if not exists external_reference text,
  add column if not exists external_url text,
  add column if not exists response_outcome text,
  add column if not exists response_body text,
  add column if not exists responder_name text,
  add column if not exists created_by uuid,
  add column if not exists sent_by uuid,
  add column if not exists response_recorded_by uuid,
  add column if not exists closed_by uuid,
  add column if not exists closed_at timestamptz,
  add column if not exists closure_reason text,
  add column if not exists idempotency_key text,
  add column if not exists state_version bigint not null default 1,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.case_clarification_requests
set
  evidence_gap = coalesce(evidence_gap, request_summary),
  subject = coalesce(subject, 'Evidence request'),
  request_body = coalesce(request_body, request_summary);

alter table public.case_clarification_requests
  alter column evidence_gap set not null,
  alter column subject set not null,
  alter column request_body set not null;

alter table public.case_clarification_requests
  drop constraint if exists case_clarification_requests_source_channel_check,
  drop constraint if exists case_clarification_requests_status_check,
  drop constraint if exists case_clarification_requests_target_type_check;

alter table public.case_clarification_requests
  add constraint case_clarification_requests_target_type_check
    check (target_type in ('carrier', '3pl', 'warehouse', 'supplier', 'customer', 'internal')),
  add constraint case_clarification_requests_status_check
    check (status in ('draft', 'sent', 'waiting_response', 'response_received', 'closed', 'cancelled')),
  add constraint case_clarification_requests_source_channel_check
    check (source_channel is null or source_channel in ('email', 'api', 'manual', 'portal', 'gorgias'));

do $block$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'case_investigations_created_by_fkey'
      and conrelid = 'public.case_clarification_requests'::regclass
  ) then
    alter table public.case_clarification_requests
      add constraint case_investigations_created_by_fkey
        foreign key (created_by) references auth.users(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'case_investigations_sent_by_fkey'
      and conrelid = 'public.case_clarification_requests'::regclass
  ) then
    alter table public.case_clarification_requests
      add constraint case_investigations_sent_by_fkey
        foreign key (sent_by) references auth.users(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'case_investigations_response_recorded_by_fkey'
      and conrelid = 'public.case_clarification_requests'::regclass
  ) then
    alter table public.case_clarification_requests
      add constraint case_investigations_response_recorded_by_fkey
        foreign key (response_recorded_by) references auth.users(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'case_investigations_closed_by_fkey'
      and conrelid = 'public.case_clarification_requests'::regclass
  ) then
    alter table public.case_clarification_requests
      add constraint case_investigations_closed_by_fkey
        foreign key (closed_by) references auth.users(id) on delete set null;
  end if;
end;
$block$;

create index if not exists case_investigations_case_idx
  on public.case_clarification_requests (merchant_id, support_payout_case_id, created_at desc);
create unique index if not exists case_investigations_idempotency_key
  on public.case_clarification_requests (merchant_id, idempotency_key)
  where idempotency_key is not null;

comment on column public.recovery_cases.amount_approved_minor is
  'Provider approval amount. Approval is not recovered cash.';
comment on table public.case_clarification_requests is
  'Case investigation read model. Transport and provider response facts remain explicit.';
