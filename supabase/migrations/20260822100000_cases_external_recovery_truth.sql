-- Cases evidence truth and external recovery.
--
-- This migration is deliberately additive. The existing reconciliation,
-- responsibility, recovery, correspondence, credit, and financial records
-- remain the source history. These records add the missing provider-claim
-- lifecycle and make its projection explicit without pretending that a
-- recommendation or approval is an external outcome.

alter table public.evidence_items
  add column if not exists case_source_class text;
alter table public.evidence_items
  add column if not exists source_lineage_root_id uuid;

do $block$
begin
  alter table public.evidence_items
    add constraint evidence_items_case_source_class_check
    check (case_source_class is null or case_source_class in ('helpdesk', 'store', 'three_pl', 'courier', 'customer_history'));
exception when duplicate_object then null;
end
$block$;

do $block$
begin
  alter table public.evidence_items
    add constraint evidence_items_source_lineage_root_fkey
    foreign key (source_lineage_root_id) references public.evidence_items(id) on delete set null;
exception when duplicate_object then null;
end
$block$;

-- Rule rows become immutable once a recommendation has referenced them. A new
-- row, with supersedes_rule_id, is the only way to change an approved term.
alter table public.partner_recovery_rules
  add column if not exists version_number integer not null default 1;
alter table public.partner_recovery_rules
  add column if not exists supersedes_rule_id uuid;
alter table public.partner_recovery_rules
  add column if not exists jurisdiction text;
alter table public.partner_recovery_rules
  add column if not exists service_codes text[] not null default '{}'::text[];
alter table public.partner_recovery_rules
  add column if not exists effective_from timestamptz;
alter table public.partner_recovery_rules
  add column if not exists effective_to timestamptz;
alter table public.partner_recovery_rules
  add column if not exists claimant_roles text[] not null default '{}'::text[];
alter table public.partner_recovery_rules
  add column if not exists minimum_wait_days integer;
alter table public.partner_recovery_rules
  add column if not exists deadline_basis text;
alter table public.partner_recovery_rules
  add column if not exists notice_deadline_days integer;
alter table public.partner_recovery_rules
  add column if not exists complete_pack_deadline_days integer;
alter table public.partner_recovery_rules
  add column if not exists critical_requirements jsonb not null default '{}'::jsonb;
alter table public.partner_recovery_rules
  add column if not exists exclusions jsonb not null default '{}'::jsonb;
alter table public.partner_recovery_rules
  add column if not exists compensation_terms jsonb not null default '{}'::jsonb;
alter table public.partner_recovery_rules
  add column if not exists terms_source_url text;
alter table public.partner_recovery_rules
  add column if not exists source_document_id uuid;
alter table public.partner_recovery_rules
  add column if not exists source_published_at timestamptz;
alter table public.partner_recovery_rules
  add column if not exists reviewed_at timestamptz;
alter table public.partner_recovery_rules
  add column if not exists reviewed_by uuid;
alter table public.partner_recovery_rules
  add column if not exists approved_at timestamptz;
alter table public.partner_recovery_rules
  add column if not exists approved_by uuid;
alter table public.partner_recovery_rules
  add column if not exists rule_approval_status text not null default 'unconfirmed';

do $block$
begin
  alter table public.partner_recovery_rules
    add constraint partner_recovery_rules_version_number_check
    check (version_number > 0);
exception when duplicate_object then null;
end
$block$;
do $block$
begin
  alter table public.partner_recovery_rules
    add constraint partner_recovery_rules_supersedes_fkey
    foreign key (supersedes_rule_id) references public.partner_recovery_rules(id) on delete set null;
exception when duplicate_object then null;
end
$block$;
do $block$
begin
  alter table public.partner_recovery_rules
    add constraint partner_recovery_rules_deadline_basis_check
    check (deadline_basis is null or deadline_basis in ('dispatch', 'delivery', 'due_date', 'eligible_claim_date', 'handoff', 'other'));
exception when duplicate_object then null;
end
$block$;
do $block$
begin
  alter table public.partner_recovery_rules
    add constraint partner_recovery_rules_approval_status_check
    check (rule_approval_status in ('unconfirmed', 'approved', 'revoked'));
exception when duplicate_object then null;
end
$block$;

create index if not exists idx_evidence_items_case_source_class
  on public.evidence_items (merchant_id, claim_id, case_source_class, occurred_at);
create index if not exists idx_evidence_items_lineage_root
  on public.evidence_items (merchant_id, source_lineage_root_id)
  where source_lineage_root_id is not null;
create index if not exists idx_partner_recovery_rules_version
  on public.partner_recovery_rules (merchant_id, partner_id, recovery_type, applies_to_claim_type, version_number desc);

create table if not exists public.recovery_claim_packs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  recovery_case_id uuid not null references public.recovery_cases(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  rule_version_id uuid references public.partner_recovery_rules(id) on delete set null,
  pack_version integer not null,
  state text not null check (state in ('draft', 'final', 'superseded')),
  posture text not null check (posture in ('strong', 'contestable', 'insufficient', 'not_assessable')),
  readiness text not null check (readiness in ('not_assessable', 'not_eligible', 'evidence_needed', 'needs_review', 'ready_to_submit', 'submitted', 'waiting_on_provider', 'provider_position_recorded', 'credited_unreconciled', 'reconciled')),
  readiness_snapshot jsonb not null default '{}'::jsonb,
  manifest jsonb not null default '{}'::jsonb,
  pdf_storage_path text,
  zip_storage_path text,
  pdf_hash text,
  zip_hash text,
  generated_at timestamptz not null default now(),
  finalized_at timestamptz,
  generated_by uuid references auth.users(id) on delete set null,
  supersedes_pack_id uuid references public.recovery_claim_packs(id) on delete set null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (merchant_id, recovery_case_id, pack_version),
  unique (merchant_id, idempotency_key)
);

create table if not exists public.recovery_claim_submissions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  recovery_case_id uuid not null references public.recovery_cases(id) on delete cascade,
  claim_pack_id uuid not null references public.recovery_claim_packs(id) on delete restrict,
  channel text not null check (channel in ('manual_portal', 'manual_email', 'manual_other')),
  provider_account_reference text,
  external_claim_reference text,
  external_url text,
  amount_sought_minor bigint,
  currency text,
  submitted_at timestamptz not null,
  submitted_by uuid references auth.users(id) on delete set null,
  receipt_evidence_item_id uuid references public.evidence_items(id) on delete set null,
  receipt_correspondence_id uuid references public.external_correspondence(id) on delete set null,
  notes text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (merchant_id, idempotency_key)
);

create table if not exists public.recovery_provider_responses (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  recovery_case_id uuid not null references public.recovery_cases(id) on delete cascade,
  submission_id uuid references public.recovery_claim_submissions(id) on delete set null,
  provider text not null,
  liability_position text not null check (liability_position in ('not_recorded', 'accepted', 'partially_accepted', 'denied', 'no_admission', 'unknown')),
  compensation_state text not null check (compensation_state in ('not_decided', 'approved', 'partially_approved', 'denied', 'credited', 'reconciled', 'written_off')),
  provider_amount_minor bigint,
  approved_amount_minor bigint,
  credited_amount_minor bigint,
  currency text,
  external_reference text,
  external_url text,
  response_evidence_item_id uuid references public.evidence_items(id) on delete set null,
  response_correspondence_id uuid references public.external_correspondence(id) on delete set null,
  received_at timestamptz not null,
  recorded_by uuid references auth.users(id) on delete set null,
  notes text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (merchant_id, idempotency_key),
  check (provider_amount_minor is null or provider_amount_minor >= 0),
  check (approved_amount_minor is null or approved_amount_minor >= 0),
  check (credited_amount_minor is null or credited_amount_minor >= 0)
);

alter table public.recovery_cases
  add column if not exists current_claim_pack_id uuid;
alter table public.recovery_cases
  add column if not exists latest_submission_id uuid;
alter table public.recovery_cases
  add column if not exists latest_provider_response_id uuid;
alter table public.recovery_cases
  add column if not exists provider_position text not null default 'not_recorded';
alter table public.recovery_cases
  add column if not exists provider_position_at timestamptz;
alter table public.recovery_cases
  add column if not exists claim_readiness text not null default 'not_assessable';

do $block$
begin
  alter table public.recovery_cases
    add constraint recovery_cases_provider_position_check
    check (provider_position in ('not_recorded', 'accepted', 'partially_accepted', 'denied', 'no_admission', 'unknown'));
exception when duplicate_object then null;
end
$block$;
do $block$
begin
  alter table public.recovery_cases
    add constraint recovery_cases_claim_readiness_check
    check (claim_readiness in ('not_assessable', 'not_eligible', 'evidence_needed', 'needs_review', 'ready_to_submit', 'submitted', 'waiting_on_provider', 'provider_position_recorded', 'credited_unreconciled', 'reconciled'));
exception when duplicate_object then null;
end
$block$;
do $block$
begin
  alter table public.recovery_cases
    add constraint recovery_cases_current_claim_pack_fkey
    foreign key (current_claim_pack_id) references public.recovery_claim_packs(id) on delete set null;
exception when duplicate_object then null;
end
$block$;
do $block$
begin
  alter table public.recovery_cases
    add constraint recovery_cases_latest_submission_fkey
    foreign key (latest_submission_id) references public.recovery_claim_submissions(id) on delete set null;
exception when duplicate_object then null;
end
$block$;
do $block$
begin
  alter table public.recovery_cases
    add constraint recovery_cases_latest_provider_response_fkey
    foreign key (latest_provider_response_id) references public.recovery_provider_responses(id) on delete set null;
exception when duplicate_object then null;
end
$block$;

create index if not exists idx_recovery_claim_packs_case
  on public.recovery_claim_packs (merchant_id, recovery_case_id, pack_version desc);
create index if not exists idx_recovery_claim_submissions_case
  on public.recovery_claim_submissions (merchant_id, recovery_case_id, submitted_at desc);
create index if not exists idx_recovery_provider_responses_case
  on public.recovery_provider_responses (merchant_id, recovery_case_id, received_at desc);

create or replace function public.protect_partner_recovery_rule_history()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if exists (
    select 1 from public.case_recommendation_snapshots
    where merchant_id = old.merchant_id
      and partner_recovery_rule_version_id = old.id
  ) then
    if row(old.rule_name, old.recovery_type, old.applies_to_claim_type,
           old.claimable_costs, old.excluded_costs, old.required_evidence,
           old.deadline_days, old.liability_cap_amount, old.liability_cap_currency,
           old.liability_cap_basis, old.submission_method, old.submission_url,
           old.submission_email, old.jurisdiction, old.service_codes,
           old.effective_from, old.effective_to, old.claimant_roles,
           old.minimum_wait_days, old.deadline_basis, old.notice_deadline_days,
           old.complete_pack_deadline_days, old.critical_requirements,
           old.exclusions, old.compensation_terms, old.terms_source_url,
           old.source_document_id, old.source_published_at, old.approved_at,
           old.approved_by)
       is distinct from
       row(new.rule_name, new.recovery_type, new.applies_to_claim_type,
           new.claimable_costs, new.excluded_costs, new.required_evidence,
           new.deadline_days, new.liability_cap_amount, new.liability_cap_currency,
           new.liability_cap_basis, new.submission_method, new.submission_url,
           new.submission_email, new.jurisdiction, new.service_codes,
           new.effective_from, new.effective_to, new.claimant_roles,
           new.minimum_wait_days, new.deadline_basis, new.notice_deadline_days,
           new.complete_pack_deadline_days, new.critical_requirements,
           new.exclusions, new.compensation_terms, new.terms_source_url,
           new.source_document_id, new.source_published_at, new.approved_at,
           new.approved_by) then
      raise exception 'partner_recovery_rule_version_is_immutable' using errcode = '55000';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_partner_recovery_rule_history on public.partner_recovery_rules;
create trigger trg_partner_recovery_rule_history
before update on public.partner_recovery_rules
for each row execute function public.protect_partner_recovery_rule_history();

create or replace function public.protect_recovery_claim_history()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if coalesce(current_setting('app.allow_recovery_claim_history_purge', true), '') = 'on'
     and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'recovery_claim_history_is_append_only' using errcode = '55000';
end;
$function$;

drop trigger if exists trg_recovery_claim_packs_append_only on public.recovery_claim_packs;
create trigger trg_recovery_claim_packs_append_only
before update or delete on public.recovery_claim_packs
for each row execute function public.protect_recovery_claim_history();
drop trigger if exists trg_recovery_claim_submissions_append_only on public.recovery_claim_submissions;
create trigger trg_recovery_claim_submissions_append_only
before update or delete on public.recovery_claim_submissions
for each row execute function public.protect_recovery_claim_history();
drop trigger if exists trg_recovery_provider_responses_append_only on public.recovery_provider_responses;
create trigger trg_recovery_provider_responses_append_only
before update or delete on public.recovery_provider_responses
for each row execute function public.protect_recovery_claim_history();

alter table public.recovery_claim_packs enable row level security;
alter table public.recovery_claim_submissions enable row level security;
alter table public.recovery_provider_responses enable row level security;

-- The baseline database grants are explicit rather than inherited. Read access
-- is tenant-filtered by the policies below; writes stay service-role/RPC-only.
grant select on public.recovery_claim_packs,
  public.recovery_claim_submissions,
  public.recovery_provider_responses to authenticated;
grant select, insert, update, delete on public.recovery_claim_packs,
  public.recovery_claim_submissions,
  public.recovery_provider_responses to service_role;

drop policy if exists recovery_claim_packs_member_select on public.recovery_claim_packs;
create policy recovery_claim_packs_member_select on public.recovery_claim_packs
  for select to authenticated using (public.is_merchant_member(merchant_id));
drop policy if exists recovery_claim_submissions_member_select on public.recovery_claim_submissions;
create policy recovery_claim_submissions_member_select on public.recovery_claim_submissions
  for select to authenticated using (public.is_merchant_member(merchant_id));
drop policy if exists recovery_provider_responses_member_select on public.recovery_provider_responses;
create policy recovery_provider_responses_member_select on public.recovery_provider_responses
  for select to authenticated using (public.is_merchant_member(merchant_id));

revoke insert, update, delete on public.recovery_claim_packs from anon, authenticated;
revoke insert, update, delete on public.recovery_claim_submissions from anon, authenticated;
revoke insert, update, delete on public.recovery_provider_responses from anon, authenticated;

create or replace function public.record_recovery_claim_pack(
  p_merchant_id uuid,
  p_recovery_case_id uuid,
  p_support_payout_case_id uuid,
  p_rule_version_id uuid,
  p_state text,
  p_posture text,
  p_readiness text,
  p_readiness_snapshot jsonb,
  p_manifest jsonb,
  p_pdf_storage_path text,
  p_zip_storage_path text,
  p_pdf_hash text,
  p_zip_hash text,
  p_generated_by uuid,
  p_idempotency_key text,
  p_supersedes_pack_id uuid default null
)
returns setof public.recovery_claim_packs
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_pack public.recovery_claim_packs;
  v_version integer;
begin
  select * into v_pack from public.recovery_claim_packs
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then return next v_pack; return; end if;

  if not exists (
    select 1 from public.recovery_cases
    where id = p_recovery_case_id and merchant_id = p_merchant_id
      and support_payout_case_id = p_support_payout_case_id
  ) then
    raise exception 'recovery_case_not_found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.support_payout_cases
    where id = p_support_payout_case_id and merchant_id = p_merchant_id
  ) then
    raise exception 'support_payout_case_not_found' using errcode = 'P0002';
  end if;
  if p_rule_version_id is not null and not exists (
    select 1 from public.partner_recovery_rules
    where id = p_rule_version_id and merchant_id = p_merchant_id
  ) then
    raise exception 'rule_version_not_found' using errcode = 'P0002';
  end if;
  if p_supersedes_pack_id is not null and not exists (
    select 1 from public.recovery_claim_packs
    where id = p_supersedes_pack_id and merchant_id = p_merchant_id and recovery_case_id = p_recovery_case_id
  ) then
    raise exception 'superseded_claim_pack_not_found' using errcode = 'P0002';
  end if;
  if p_state = 'final' and p_readiness <> 'ready_to_submit' then
    raise exception 'final_claim_pack_requires_ready_state' using errcode = '22023';
  end if;
  select coalesce(max(pack_version), 0) + 1 into v_version
  from public.recovery_claim_packs
  where merchant_id = p_merchant_id and recovery_case_id = p_recovery_case_id;

  insert into public.recovery_claim_packs (
    merchant_id, recovery_case_id, support_payout_case_id, rule_version_id,
    pack_version, state, posture, readiness, readiness_snapshot, manifest,
    pdf_storage_path, zip_storage_path, pdf_hash, zip_hash, finalized_at,
    generated_by, supersedes_pack_id, idempotency_key
  ) values (
    p_merchant_id, p_recovery_case_id, p_support_payout_case_id, p_rule_version_id,
    v_version, p_state, p_posture, p_readiness, coalesce(p_readiness_snapshot, '{}'::jsonb),
    coalesce(p_manifest, '{}'::jsonb), p_pdf_storage_path, p_zip_storage_path,
    p_pdf_hash, p_zip_hash, case when p_state = 'final' then now() else null end,
    p_generated_by, p_supersedes_pack_id, p_idempotency_key
  ) returning * into v_pack;

  if p_state = 'final' then
    update public.recovery_cases
    set current_claim_pack_id = v_pack.id,
        claim_readiness = 'ready_to_submit',
        updated_at = now()
    where id = p_recovery_case_id and merchant_id = p_merchant_id;
  end if;
  return next v_pack;
end;
$function$;

create or replace function public.record_recovery_claim_submission(
  p_merchant_id uuid,
  p_recovery_case_id uuid,
  p_claim_pack_id uuid,
  p_channel text,
  p_provider_account_reference text,
  p_external_claim_reference text,
  p_external_url text,
  p_amount_sought_minor bigint,
  p_currency text,
  p_submitted_at timestamptz,
  p_submitted_by uuid,
  p_receipt_evidence_item_id uuid,
  p_receipt_correspondence_id uuid,
  p_notes text,
  p_idempotency_key text
)
returns setof public.recovery_claim_submissions
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_submission public.recovery_claim_submissions;
begin
  select * into v_submission from public.recovery_claim_submissions
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then return next v_submission; return; end if;
  if not exists (
    select 1 from public.recovery_claim_packs
    where id = p_claim_pack_id and merchant_id = p_merchant_id
      and recovery_case_id = p_recovery_case_id and state = 'final'
  ) then
    raise exception 'final_claim_pack_required' using errcode = '22023';
  end if;
  if p_receipt_evidence_item_id is not null and not exists (
    select 1 from public.evidence_items
    where id = p_receipt_evidence_item_id and merchant_id = p_merchant_id
  ) then
    raise exception 'receipt_evidence_not_found' using errcode = 'P0002';
  end if;
  if p_receipt_correspondence_id is not null and not exists (
    select 1 from public.external_correspondence
    where id = p_receipt_correspondence_id and merchant_id = p_merchant_id
  ) then
    raise exception 'receipt_correspondence_not_found' using errcode = 'P0002';
  end if;
  insert into public.recovery_claim_submissions (
    merchant_id, recovery_case_id, claim_pack_id, channel,
    provider_account_reference, external_claim_reference, external_url,
    amount_sought_minor, currency, submitted_at, submitted_by,
    receipt_evidence_item_id, receipt_correspondence_id, notes, idempotency_key
  ) values (
    p_merchant_id, p_recovery_case_id, p_claim_pack_id, p_channel,
    p_provider_account_reference, p_external_claim_reference, p_external_url,
    p_amount_sought_minor, upper(p_currency), coalesce(p_submitted_at, now()), p_submitted_by,
    p_receipt_evidence_item_id, p_receipt_correspondence_id, p_notes, p_idempotency_key
  ) returning * into v_submission;
  update public.recovery_cases
  set latest_submission_id = v_submission.id,
      claim_readiness = 'submitted',
      provider_claim_stage = case when provider_claim_stage = 'prepared' then 'sent' else provider_claim_stage end,
      updated_at = now()
  where id = p_recovery_case_id and merchant_id = p_merchant_id;
  return next v_submission;
end;
$function$;

create or replace function public.record_recovery_provider_response(
  p_merchant_id uuid,
  p_recovery_case_id uuid,
  p_submission_id uuid,
  p_provider text,
  p_liability_position text,
  p_compensation_state text,
  p_provider_amount_minor bigint,
  p_approved_amount_minor bigint,
  p_credited_amount_minor bigint,
  p_currency text,
  p_external_reference text,
  p_external_url text,
  p_response_evidence_item_id uuid,
  p_response_correspondence_id uuid,
  p_received_at timestamptz,
  p_recorded_by uuid,
  p_notes text,
  p_idempotency_key text
)
returns setof public.recovery_provider_responses
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_response public.recovery_provider_responses;
  v_readiness text;
begin
  select * into v_response from public.recovery_provider_responses
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then return next v_response; return; end if;
  if not exists (
    select 1 from public.recovery_cases
    where id = p_recovery_case_id and merchant_id = p_merchant_id
  ) then
    raise exception 'recovery_case_not_found' using errcode = 'P0002';
  end if;
  if p_submission_id is not null and not exists (
    select 1 from public.recovery_claim_submissions
    where id = p_submission_id and merchant_id = p_merchant_id and recovery_case_id = p_recovery_case_id
  ) then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;
  if p_response_evidence_item_id is not null and not exists (
    select 1 from public.evidence_items
    where id = p_response_evidence_item_id and merchant_id = p_merchant_id
  ) then
    raise exception 'response_evidence_not_found' using errcode = 'P0002';
  end if;
  if p_response_correspondence_id is not null and not exists (
    select 1 from public.external_correspondence
    where id = p_response_correspondence_id and merchant_id = p_merchant_id
  ) then
    raise exception 'response_correspondence_not_found' using errcode = 'P0002';
  end if;
  if p_credited_amount_minor is not null and p_approved_amount_minor is not null
     and p_credited_amount_minor > p_approved_amount_minor then
    raise exception 'credited_amount_exceeds_approved_amount' using errcode = '22023';
  end if;
  insert into public.recovery_provider_responses (
    merchant_id, recovery_case_id, submission_id, provider, liability_position,
    compensation_state, provider_amount_minor, approved_amount_minor,
    credited_amount_minor, currency, external_reference, external_url,
    response_evidence_item_id, response_correspondence_id, received_at,
    recorded_by, notes, idempotency_key
  ) values (
    p_merchant_id, p_recovery_case_id, p_submission_id, p_provider, p_liability_position,
    p_compensation_state, p_provider_amount_minor, p_approved_amount_minor,
    p_credited_amount_minor, upper(p_currency), p_external_reference, p_external_url,
    p_response_evidence_item_id, p_response_correspondence_id, coalesce(p_received_at, now()),
    p_recorded_by, p_notes, p_idempotency_key
  ) returning * into v_response;
  v_readiness := case
    when p_compensation_state = 'reconciled' then 'reconciled'
    when p_compensation_state = 'credited' then 'credited_unreconciled'
    else 'provider_position_recorded'
  end;
  update public.recovery_cases
  set latest_provider_response_id = v_response.id,
      provider_position = p_liability_position,
      provider_position_at = v_response.received_at,
      claim_readiness = v_readiness,
      provider_claim_stage = case
        when p_compensation_state = 'reconciled' then 'reconciled'
        when p_compensation_state = 'credited' then 'credited'
        when p_compensation_state in ('approved', 'partially_approved') then 'approved'
        else 'acknowledged'
      end,
      updated_at = now()
  where id = p_recovery_case_id and merchant_id = p_merchant_id;
  return next v_response;
end;
$function$;

revoke all on function public.record_recovery_claim_pack(uuid, uuid, uuid, uuid, text, text, text, jsonb, jsonb, text, text, text, text, uuid, text, uuid) from public;
revoke all on function public.record_recovery_claim_submission(uuid, uuid, uuid, text, text, text, text, bigint, text, timestamptz, uuid, uuid, uuid, text, text) from public;
revoke all on function public.record_recovery_provider_response(uuid, uuid, uuid, text, text, text, bigint, bigint, bigint, text, text, text, uuid, uuid, timestamptz, uuid, text, text) from public;
grant execute on function public.record_recovery_claim_pack(uuid, uuid, uuid, uuid, text, text, text, jsonb, jsonb, text, text, text, text, uuid, text, uuid) to service_role;
grant execute on function public.record_recovery_claim_submission(uuid, uuid, uuid, text, text, text, text, bigint, text, timestamptz, uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.record_recovery_provider_response(uuid, uuid, uuid, text, text, text, bigint, bigint, bigint, text, text, text, uuid, uuid, timestamptz, uuid, text, text) to service_role;

comment on table public.recovery_claim_packs is
  'Immutable provider claim-pack versions. A final pack is only a frozen manifest of merchant-approved source evidence.';
comment on table public.recovery_claim_submissions is
  'Append-only manual external submission receipts. Unauth never sends a provider claim.';
comment on table public.recovery_provider_responses is
  'Append-only provider positions and compensation records; approval, credit, and reconciliation remain separate.';
comment on column public.recovery_cases.provider_position is
  'Provider liability position, separate from merchant responsibility recommendation and recovery stage.';
