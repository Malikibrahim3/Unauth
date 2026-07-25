-- Release 1 investigation lifecycle, transport ledger, partner settings, and
-- responsibility projection. The existing support payout case remains the
-- canonical parent.

do $block$
begin
  if exists (
    select 1
    from public.case_clarification_requests request
    join public.support_payout_cases payout_case
      on payout_case.id = request.support_payout_case_id
    where payout_case.merchant_id <> request.merchant_id
  ) then
    raise exception 'case_investigation_tenant_mismatch_preflight_failed'
      using errcode = '23514',
            hint = 'Repair cross-merchant case clarification rows before applying this migration.';
  end if;
end;
$block$;

alter table public.support_payout_cases
  add constraint support_payout_cases_id_merchant_id_key unique (id, merchant_id);

alter table public.case_clarification_requests
  add column partner_id uuid,
  add column is_primary boolean not null default false,
  add column evidence_gap text,
  add column recommended_reason text,
  add column override_rationale text,
  add column subject text,
  add column request_body text,
  add column recipient text,
  add column external_reference text,
  add column external_url text,
  add column response_outcome text,
  add column response_body text,
  add column responder_name text,
  add column created_by uuid,
  add column sent_by uuid,
  add column response_recorded_by uuid,
  add column closed_by uuid,
  add column closed_at timestamptz,
  add column closure_reason text,
  add column idempotency_key text,
  add column state_version bigint not null default 1,
  add column metadata jsonb not null default '{}'::jsonb;

update public.case_clarification_requests
set
  request_body = coalesce(request_body, request_summary),
  evidence_gap = coalesce(evidence_gap, request_summary),
  subject = coalesce(subject, 'Evidence request'),
  status = case when status = 'sent' then 'waiting_response' else status end;

with ranked as (
  select
    id,
    row_number() over (
      partition by merchant_id, support_payout_case_id
      order by
        case when status = 'waiting_response' and sent_at is not null then 0 else 1 end,
        coalesce(sent_at, created_at),
        id
    ) as position
  from public.case_clarification_requests
  where status in ('draft', 'waiting_response', 'response_received')
)
update public.case_clarification_requests request
set is_primary = ranked.position = 1
from ranked
where request.id = ranked.id;

alter table public.case_clarification_requests
  alter column evidence_gap set not null,
  alter column request_body set not null,
  alter column subject set not null;

alter table public.case_clarification_requests
  drop constraint if exists case_clarification_requests_support_payout_case_id_fkey,
  drop constraint if exists case_clarification_requests_source_channel_check,
  drop constraint if exists case_clarification_requests_status_check,
  drop constraint if exists case_clarification_requests_target_type_check;

alter table public.case_clarification_requests
  add constraint case_investigations_case_merchant_fkey
    foreign key (support_payout_case_id, merchant_id)
    references public.support_payout_cases (id, merchant_id)
    on delete cascade,
  add constraint case_investigations_partner_merchant_fkey
    foreign key (partner_id, merchant_id)
    references public.partners (id, merchant_id)
    on delete restrict,
  add constraint case_investigations_target_type_check
    check (target_type in ('carrier', '3pl', 'warehouse', 'supplier', 'customer', 'internal')),
  add constraint case_investigations_status_check
    check (status in ('draft', 'sent', 'waiting_response', 'response_received', 'closed', 'cancelled')),
  add constraint case_investigations_source_channel_check
    check (source_channel is null or source_channel in ('email', 'api', 'manual', 'portal', 'gorgias')),
  add constraint case_investigations_response_outcome_check
    check (
      response_outcome is null
      or response_outcome in (
        'issue_confirmed', 'no_issue_found', 'inconclusive',
        'referred_elsewhere', 'no_response'
      )
    ),
  add constraint case_investigations_text_lengths_check
    check (
      char_length(evidence_gap) between 3 and 2000
      and char_length(subject) between 1 and 500
      and char_length(request_body) between 1 and 20000
      and (recommended_reason is null or char_length(recommended_reason) <= 2000)
      and (override_rationale is null or char_length(override_rationale) between 5 and 2000)
      and (response_body is null or char_length(response_body) <= 50000)
      and (response_summary is null or char_length(response_summary) <= 10000)
      and (closure_reason is null or char_length(closure_reason) <= 2000)
    ),
  add constraint case_investigations_state_version_check
    check (state_version >= 1);

alter table public.case_clarification_requests
  add constraint case_investigations_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null,
  add constraint case_investigations_sent_by_fkey
    foreign key (sent_by) references auth.users(id) on delete set null,
  add constraint case_investigations_response_recorded_by_fkey
    foreign key (response_recorded_by) references auth.users(id) on delete set null,
  add constraint case_investigations_closed_by_fkey
    foreign key (closed_by) references auth.users(id) on delete set null;

drop index if exists public.idx_case_clarification_requests_case;
create index case_investigations_case_idx
  on public.case_clarification_requests (
    merchant_id, support_payout_case_id, created_at desc
  );
create index case_investigations_waiting_idx
  on public.case_clarification_requests (merchant_id, status, due_at)
  where status = 'waiting_response';
create unique index case_investigations_id_merchant_key
  on public.case_clarification_requests (id, merchant_id);
create unique index case_investigations_idempotency_key
  on public.case_clarification_requests (merchant_id, idempotency_key)
  where idempotency_key is not null;
create unique index case_investigations_one_open_primary
  on public.case_clarification_requests (merchant_id, support_payout_case_id)
  where is_primary
    and status in ('draft', 'sent', 'waiting_response', 'response_received');

create or replace function public.protect_sent_case_investigation_snapshot()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if old.status <> 'draft' and (
    new.target_type is distinct from old.target_type
    or new.target_name is distinct from old.target_name
    or new.partner_id is distinct from old.partner_id
    or new.evidence_gap is distinct from old.evidence_gap
    or new.requested_evidence is distinct from old.requested_evidence
    or new.subject is distinct from old.subject
    or new.request_body is distinct from old.request_body
    or new.recipient is distinct from old.recipient
    or new.source_channel is distinct from old.source_channel
  ) then
    raise exception 'sent_investigation_snapshot_is_immutable' using errcode = '22023';
  end if;
  return new;
end;
$function$;

create trigger trg_case_investigation_snapshot
before update on public.case_clarification_requests
for each row execute function public.protect_sent_case_investigation_snapshot();

create table public.case_investigation_dispatches (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  investigation_id uuid not null,
  dispatch_kind text not null,
  channel text not null,
  idempotency_key text not null,
  request_hash text not null,
  status text not null default 'requested',
  lease_token uuid,
  leased_until timestamptz,
  provider_message_id text,
  attempt_count integer not null default 0,
  last_error text,
  accepted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_investigation_dispatches_investigation_merchant_fkey
    foreign key (investigation_id, merchant_id)
    references public.case_clarification_requests (id, merchant_id)
    on delete cascade,
  constraint case_investigation_dispatches_kind_check
    check (dispatch_kind in ('initial_request', 'chase')),
  constraint case_investigation_dispatches_channel_check
    check (channel in ('email', 'manual', 'portal', 'api')),
  constraint case_investigation_dispatches_status_check
    check (status in ('requested', 'processing', 'accepted', 'failed')),
  constraint case_investigation_dispatches_attempt_count_check
    check (attempt_count >= 0),
  constraint case_investigation_dispatches_request_hash_check
    check (request_hash ~ '^[0-9a-f]{64}$'),
  unique (merchant_id, idempotency_key)
);

create index case_investigation_dispatches_investigation_idx
  on public.case_investigation_dispatches (
    merchant_id, investigation_id, created_at desc
  );
create index case_investigation_dispatches_retry_idx
  on public.case_investigation_dispatches (status, leased_until)
  where status in ('requested', 'processing', 'failed');

create trigger trg_case_investigation_dispatches_updated
before update on public.case_investigation_dispatches
for each row execute function public.set_updated_at();

alter table public.partners
  add column default_contact_channel text,
  add column response_sla_hours integer,
  add column contact_instructions text,
  add constraint partners_default_contact_channel_check
    check (
      default_contact_channel is null
      or default_contact_channel in ('email', 'portal', 'manual', 'api')
    ),
  add constraint partners_response_sla_hours_check
    check (response_sla_hours is null or response_sla_hours between 1 and 2160),
  add constraint partners_contact_instructions_length_check
    check (contact_instructions is null or char_length(contact_instructions) <= 4000);

alter table public.merchants
  add column investigation_response_sla_hours integer not null default 48,
  add column investigation_reply_to text,
  add column investigation_email_enabled boolean not null default false,
  add constraint merchants_investigation_sla_check
    check (investigation_response_sla_hours between 1 and 2160),
  add constraint merchants_investigation_reply_to_check
    check (
      investigation_reply_to is null
      or investigation_reply_to ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    );

alter table public.support_payout_cases
  add column responsibility_confirmation_state text not null default 'unconfirmed',
  add column responsibility_confirmed_at timestamptz,
  add column responsibility_confirmed_by uuid references auth.users(id) on delete set null,
  add column responsibility_event_id uuid references public.domain_events(id) on delete set null,
  add constraint support_payout_cases_responsibility_state_check
    check (responsibility_confirmation_state in ('unconfirmed', 'confirmed', 'corrected')),
  add constraint support_payout_cases_responsibility_projection_check
    check (
      responsibility_confirmation_state = 'unconfirmed'
      or (
        responsibility_confirmed_at is not null
        and responsibility_event_id is not null
      )
    );

-- Investigation writes are server-mediated so lifecycle, permission, tenant,
-- idempotency, event, and task updates cannot be bypassed by a browser client.
drop policy if exists "case_clarification_requests_member_insert"
  on public.case_clarification_requests;
drop policy if exists "case_clarification_requests_member_update"
  on public.case_clarification_requests;
drop policy if exists "case_clarification_requests_member_select"
  on public.case_clarification_requests;

revoke insert, update, delete on public.case_clarification_requests
  from public, anon, authenticated;
grant select on public.case_clarification_requests to authenticated;
grant all on public.case_clarification_requests to service_role;
create policy case_investigations_member_select
  on public.case_clarification_requests
  for select to authenticated
  using (public.is_merchant_member(merchant_id));
create policy case_investigations_service_all
  on public.case_clarification_requests
  for all to service_role
  using (true) with check (true);

alter table public.case_investigation_dispatches enable row level security;
revoke all on public.case_investigation_dispatches from public, anon, authenticated;
grant select on public.case_investigation_dispatches to authenticated;
grant all on public.case_investigation_dispatches to service_role;
create policy case_investigation_dispatches_member_select
  on public.case_investigation_dispatches
  for select to authenticated
  using (public.is_merchant_member(merchant_id));
create policy case_investigation_dispatches_service_all
  on public.case_investigation_dispatches
  for all to service_role
  using (true) with check (true);

create trigger trg_case_investigations_durable_audit
after insert or update or delete on public.case_clarification_requests
for each row execute function public.capture_sensitive_audit_event();
create trigger trg_case_investigation_dispatches_durable_audit
after insert or update or delete on public.case_investigation_dispatches
for each row execute function public.capture_sensitive_audit_event();

revoke all on function public.protect_sent_case_investigation_snapshot()
  from public, anon, authenticated;

comment on table public.case_clarification_requests is
  'Case investigations attached to the canonical support payout case; transport and response facts are explicit.';
comment on table public.case_investigation_dispatches is
  'Durable idempotent transport attempts for case investigation requests and chases.';

create or replace function public.investigation_case_status(p_target_type text)
returns public.claim_status
language sql
immutable
set search_path = public
as $function$
  select case p_target_type
    when 'carrier' then 'awaiting_carrier_response'::public.claim_status
    when '3pl' then 'awaiting_3pl_response'::public.claim_status
    when 'warehouse' then 'awaiting_3pl_response'::public.claim_status
    when 'supplier' then 'awaiting_supplier_response'::public.claim_status
    when 'customer' then 'awaiting_customer_evidence'::public.claim_status
    else 'manual_review'::public.claim_status
  end;
$function$;

create or replace function public.create_case_investigation(
  p_merchant_id uuid,
  p_case_id uuid,
  p_target_type text,
  p_target_name text,
  p_partner_id uuid,
  p_evidence_gap text,
  p_recommended_reason text,
  p_override_rationale text,
  p_requested_evidence text[],
  p_request_summary text,
  p_subject text,
  p_request_body text,
  p_recipient text,
  p_source_channel text,
  p_due_at timestamptz,
  p_is_primary boolean,
  p_actor_user_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_investigation public.case_clarification_requests;
  v_existing public.case_clarification_requests;
  v_event public.domain_events;
  v_is_primary boolean;
  v_result jsonb;
begin
  if p_merchant_id is null or p_case_id is null or p_actor_user_id is null then
    raise exception 'investigation_identifiers_required' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 180 then
    raise exception 'investigation_idempotency_key_invalid' using errcode = '22023';
  end if;
  if p_target_type not in ('carrier', '3pl', 'warehouse', 'supplier', 'customer', 'internal')
     or coalesce(length(trim(p_evidence_gap)), 0) < 3
     or coalesce(length(trim(p_subject)), 0) < 1
     or coalesce(length(trim(p_request_body)), 0) < 1 then
    raise exception 'investigation_draft_invalid' using errcode = '22023';
  end if;

  select *
    into v_existing
  from public.case_clarification_requests
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key);
  if found then
    if v_existing.support_payout_case_id <> p_case_id
       or v_existing.target_type <> p_target_type
       or v_existing.evidence_gap <> trim(p_evidence_gap) then
      raise exception 'investigation_idempotency_conflict' using errcode = '23505';
    end if;
    return to_jsonb(v_existing) || jsonb_build_object('replayed', true);
  end if;

  perform 1
  from public.support_payout_cases
  where id = p_case_id
    and merchant_id = p_merchant_id
  for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;

  -- A concurrent retry can only pass the first lookup before the first
  -- transaction commits. Re-check after the case lock so the logical retry
  -- returns the original investigation instead of surfacing a unique error.
  select *
    into v_existing
  from public.case_clarification_requests
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key);
  if found then
    if v_existing.support_payout_case_id <> p_case_id
       or v_existing.target_type <> p_target_type
       or v_existing.evidence_gap <> trim(p_evidence_gap) then
      raise exception 'investigation_idempotency_conflict' using errcode = '23505';
    end if;
    return to_jsonb(v_existing) || jsonb_build_object('replayed', true);
  end if;

  if p_partner_id is not null and not exists (
    select 1 from public.partners
    where id = p_partner_id and merchant_id = p_merchant_id
  ) then
    raise exception 'investigation_partner_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.case_clarification_requests
    where merchant_id = p_merchant_id
      and support_payout_case_id = p_case_id
      and target_type = p_target_type
      and lower(evidence_gap) = lower(trim(p_evidence_gap))
      and status in ('draft', 'sent', 'waiting_response', 'response_received')
  ) then
    raise exception 'duplicate_open_investigation' using errcode = '23505';
  end if;

  v_is_primary := coalesce(p_is_primary, false) or not exists (
    select 1
    from public.case_clarification_requests
    where merchant_id = p_merchant_id
      and support_payout_case_id = p_case_id
      and is_primary
      and status in ('draft', 'sent', 'waiting_response', 'response_received')
  );

  if v_is_primary and exists (
    select 1
    from public.case_clarification_requests
    where merchant_id = p_merchant_id
      and support_payout_case_id = p_case_id
      and is_primary
      and status in ('draft', 'sent', 'waiting_response', 'response_received')
  ) then
    raise exception 'open_primary_investigation_exists' using errcode = '23505';
  end if;

  insert into public.case_clarification_requests (
    merchant_id, support_payout_case_id, partner_id, is_primary,
    target_type, target_name, status, evidence_gap, recommended_reason,
    override_rationale,
    requested_evidence, request_summary, subject, request_body, recipient,
    source_channel, due_at, created_by, idempotency_key
  ) values (
    p_merchant_id, p_case_id, p_partner_id, v_is_primary,
    p_target_type, nullif(trim(p_target_name), ''), 'draft',
    trim(p_evidence_gap), nullif(trim(p_recommended_reason), ''),
    nullif(trim(p_override_rationale), ''),
    coalesce(p_requested_evidence, '{}'::text[]),
    coalesce(nullif(trim(p_request_summary), ''), left(trim(p_request_body), 2000)),
    trim(p_subject), trim(p_request_body), nullif(trim(p_recipient), ''),
    nullif(p_source_channel, ''), p_due_at, p_actor_user_id,
    trim(p_idempotency_key)
  )
  returning * into v_investigation;

  v_result := to_jsonb(v_investigation) || jsonb_build_object('replayed', false);
  select *
    into v_event
  from public.record_domain_event(
    p_merchant_id,
    'investigation.created',
    'case_investigation',
    v_investigation.id,
    trim(p_idempotency_key) || ':event',
    jsonb_build_object(
      'investigation_id', v_investigation.id,
      'case_id', p_case_id,
      'target_type', p_target_type,
      'is_primary', v_is_primary,
      'evidence_gap', trim(p_evidence_gap),
      'result', v_result
    ),
    null, null, null, 'user', p_actor_user_id, now(), null, null,
    array[
      'caseProjection', 'notificationProjection',
      'workflowHandler', 'auditTimelineProjection'
    ]::text[]
  );

  return v_result || jsonb_build_object('domain_event_id', v_event.id);
end;
$function$;

create or replace function public.transition_case_investigation(
  p_merchant_id uuid,
  p_case_id uuid,
  p_investigation_id uuid,
  p_expected_version bigint,
  p_action text,
  p_patch jsonb,
  p_actor_user_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_investigation public.case_clarification_requests;
  v_updated public.case_clarification_requests;
  v_promoted public.case_clarification_requests;
  v_case public.support_payout_cases;
  v_prior_event public.domain_events;
  v_event public.domain_events;
  v_event_type text;
  v_new_status text;
  v_due_at timestamptz;
  v_case_status public.claim_status;
  v_case_expected_version bigint;
  v_case_transition jsonb;
  v_result jsonb;
  v_task_key text;
begin
  if p_merchant_id is null or p_case_id is null or p_investigation_id is null
     or p_actor_user_id is null then
    raise exception 'investigation_transition_identifiers_required' using errcode = '22023';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'investigation_expected_version_required' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 180 then
    raise exception 'investigation_transition_idempotency_key_invalid' using errcode = '22023';
  end if;
  if p_action not in ('update', 'mark_sent', 'send_accepted', 'chase', 'response', 'close', 'cancel') then
    raise exception 'investigation_action_invalid' using errcode = '22023';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'investigation_patch_invalid' using errcode = '22023';
  end if;

  select *
    into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key) || ':event';
  if found then
    if v_prior_event.aggregate_id is distinct from p_investigation_id
       or v_prior_event.payload ->> 'action' is distinct from p_action then
      raise exception 'investigation_transition_idempotency_conflict' using errcode = '23505';
    end if;
    return coalesce(v_prior_event.payload -> 'result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  select *
    into v_investigation
  from public.case_clarification_requests
  where id = p_investigation_id
    and merchant_id = p_merchant_id
    and support_payout_case_id = p_case_id
  for update;
  if not found then
    raise exception 'investigation_not_found' using errcode = 'P0002';
  end if;

  -- Re-check after the row lock. This is the concurrency-safe replay path for
  -- a retry that arrived before the first transaction recorded its event.
  select *
    into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key) || ':event';
  if found then
    if v_prior_event.aggregate_id is distinct from p_investigation_id
       or v_prior_event.payload ->> 'action' is distinct from p_action then
      raise exception 'investigation_transition_idempotency_conflict' using errcode = '23505';
    end if;
    return coalesce(v_prior_event.payload -> 'result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  if v_investigation.state_version is distinct from p_expected_version then
    raise exception 'investigation_version_conflict' using errcode = '40001';
  end if;

  select *
    into v_case
  from public.support_payout_cases
  where id = p_case_id
    and merchant_id = p_merchant_id
  for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;

  if p_action = 'update' then
    if v_investigation.status <> 'draft' then
      raise exception 'only_draft_investigations_are_editable' using errcode = '22023';
    end if;
    if exists (
      select 1
      from public.case_clarification_requests other_request
      where other_request.merchant_id = p_merchant_id
        and other_request.support_payout_case_id = p_case_id
        and other_request.id <> p_investigation_id
        and other_request.target_type =
          coalesce(nullif(p_patch ->> 'target_type', ''), v_investigation.target_type)
        and lower(other_request.evidence_gap) = lower(
          coalesce(
            nullif(trim(p_patch ->> 'evidence_gap'), ''),
            v_investigation.evidence_gap
          )
        )
        and other_request.status in (
          'draft', 'sent', 'waiting_response', 'response_received'
        )
    ) then
      raise exception 'duplicate_open_investigation' using errcode = '23505';
    end if;
    update public.case_clarification_requests
    set
      target_type = coalesce(nullif(p_patch ->> 'target_type', ''), target_type),
      target_name = case when p_patch ? 'target_name' then nullif(trim(p_patch ->> 'target_name'), '') else target_name end,
      partner_id = case when p_patch ? 'partner_id' then nullif(p_patch ->> 'partner_id', '')::uuid else partner_id end,
      evidence_gap = coalesce(nullif(trim(p_patch ->> 'evidence_gap'), ''), evidence_gap),
      recommended_reason = case when p_patch ? 'recommended_reason' then nullif(trim(p_patch ->> 'recommended_reason'), '') else recommended_reason end,
      requested_evidence = case
        when p_patch ? 'requested_evidence'
          then array(select jsonb_array_elements_text(p_patch -> 'requested_evidence'))
        else requested_evidence
      end,
      request_summary = coalesce(nullif(trim(p_patch ->> 'request_summary'), ''), request_summary),
      subject = coalesce(nullif(trim(p_patch ->> 'subject'), ''), subject),
      request_body = coalesce(nullif(trim(p_patch ->> 'request_body'), ''), request_body),
      recipient = case when p_patch ? 'recipient' then nullif(trim(p_patch ->> 'recipient'), '') else recipient end,
      source_channel = case when p_patch ? 'source_channel' then nullif(p_patch ->> 'source_channel', '') else source_channel end,
      due_at = case when p_patch ? 'due_at' then nullif(p_patch ->> 'due_at', '')::timestamptz else due_at end,
      state_version = state_version + 1
    where id = p_investigation_id
      and merchant_id = p_merchant_id
    returning * into v_updated;
    v_event_type := 'investigation.updated';

  elsif p_action in ('mark_sent', 'send_accepted') then
    if v_investigation.status <> 'draft' then
      raise exception 'investigation_must_be_draft_to_send' using errcode = '22023';
    end if;
    v_due_at := coalesce(
      nullif(p_patch ->> 'due_at', '')::timestamptz,
      v_investigation.due_at
    );
    if v_due_at is null or v_due_at <= now() then
      raise exception 'investigation_future_due_at_required' using errcode = '22023';
    end if;
    if p_action = 'send_accepted'
       and coalesce(nullif(p_patch ->> 'provider_message_id', ''), '') = '' then
      raise exception 'accepted_email_provider_message_id_required' using errcode = '22023';
    end if;

    update public.case_clarification_requests
    set
      status = 'waiting_response',
      source_channel = coalesce(nullif(p_patch ->> 'source_channel', ''), source_channel, 'manual'),
      external_reference = case when p_patch ? 'external_reference' then nullif(trim(p_patch ->> 'external_reference'), '') else external_reference end,
      external_url = case when p_patch ? 'external_url' then nullif(trim(p_patch ->> 'external_url'), '') else external_url end,
      due_at = v_due_at,
      sent_at = coalesce(nullif(p_patch ->> 'sent_at', '')::timestamptz, now()),
      sent_by = p_actor_user_id,
      metadata = metadata || jsonb_strip_nulls(jsonb_build_object(
        'provider_message_id', nullif(p_patch ->> 'provider_message_id', '')
      )),
      state_version = state_version + 1
    where id = p_investigation_id
      and merchant_id = p_merchant_id
    returning * into v_updated;
    v_event_type := 'investigation.sent';

    v_task_key := 'investigation:' || p_investigation_id::text || ':response';
    insert into public.work_tasks (
      merchant_id, support_payout_case_id, title, description,
      due_at, priority, status, source, source_metadata
    ) values (
      p_merchant_id, p_case_id,
      'Investigation response due',
      'Review or chase the response for ' || coalesce(v_updated.target_name, v_updated.target_type) || '.',
      v_due_at, 'high', 'open', 'investigation',
      jsonb_build_object(
        'migration_key', v_task_key,
        'investigation_id', p_investigation_id,
        'task_kind', 'response_due'
      )
    ) on conflict do nothing;

    if v_investigation.is_primary
       and v_case.status::text not in (
         'closed', 'resolved_refunded', 'resolved_won', 'resolved_lost',
         'resolved_denied', 'resolved_exchanged', 'voided'
       ) then
      v_case_expected_version := nullif(p_patch ->> 'case_version', '')::bigint;
      if v_case_expected_version is null then
        raise exception 'case_expected_version_required' using errcode = '22023';
      end if;
      v_case_status := public.investigation_case_status(v_updated.target_type);
      v_case_transition := public.transition_payout_case(
        p_merchant_id, p_case_id, v_case_expected_version,
        jsonb_build_object('status', v_case_status::text),
        'Primary investigation sent', p_actor_user_id,
        'merchant_manual', 'case.investigation_waiting',
        jsonb_build_object(
          'case_id', p_case_id,
          'investigation_id', p_investigation_id,
          'target_type', v_updated.target_type
        ),
        array[
          'caseProjection', 'notificationProjection',
          'workflowHandler', 'auditTimelineProjection'
        ]::text[],
        'status_changed',
        jsonb_build_object('investigation_id', p_investigation_id),
        trim(p_idempotency_key) || ':case',
        false, false, false, false
      );
    end if;

  elsif p_action = 'chase' then
    if v_investigation.status <> 'waiting_response' then
      raise exception 'only_waiting_investigations_can_be_chased' using errcode = '22023';
    end if;
    if coalesce(length(trim(p_patch ->> 'note')), 0) < 3 then
      raise exception 'investigation_chase_note_required' using errcode = '22023';
    end if;
    v_due_at := coalesce(
      nullif(p_patch ->> 'due_at', '')::timestamptz,
      v_investigation.due_at
    );
    update public.case_clarification_requests
    set
      due_at = v_due_at,
      metadata = metadata || jsonb_build_object(
        'last_chased_at', now(),
        'last_chase_note', trim(p_patch ->> 'note'),
        'chase_count', coalesce((metadata ->> 'chase_count')::integer, 0) + 1
      ),
      state_version = state_version + 1
    where id = p_investigation_id
      and merchant_id = p_merchant_id
    returning * into v_updated;
    v_event_type := 'investigation.chased';

    v_task_key := 'investigation:' || p_investigation_id::text || ':response';
    update public.work_tasks
    set due_at = v_due_at, updated_at = now()
    where merchant_id = p_merchant_id
      and source_metadata ->> 'migration_key' = v_task_key
      and status in ('open', 'in_progress', 'blocked');

  elsif p_action = 'response' then
    if v_investigation.status <> 'waiting_response' then
      raise exception 'investigation_must_be_waiting_for_response' using errcode = '22023';
    end if;
    if p_patch ->> 'response_outcome' not in (
      'issue_confirmed', 'no_issue_found', 'inconclusive', 'referred_elsewhere'
    ) or coalesce(length(trim(p_patch ->> 'response_summary')), 0) < 3 then
      raise exception 'investigation_response_invalid' using errcode = '22023';
    end if;
    update public.case_clarification_requests
    set
      status = 'response_received',
      response_outcome = p_patch ->> 'response_outcome',
      response_summary = trim(p_patch ->> 'response_summary'),
      response_body = nullif(p_patch ->> 'response_body', ''),
      responder_name = nullif(trim(p_patch ->> 'responder_name'), ''),
      external_reference = coalesce(nullif(trim(p_patch ->> 'external_reference'), ''), external_reference),
      external_url = coalesce(nullif(trim(p_patch ->> 'external_url'), ''), external_url),
      response_received_at = coalesce(
        nullif(p_patch ->> 'response_received_at', '')::timestamptz,
        now()
      ),
      response_recorded_by = p_actor_user_id,
      state_version = state_version + 1
    where id = p_investigation_id
      and merchant_id = p_merchant_id
    returning * into v_updated;
    v_event_type := 'investigation.response_recorded';

    update public.work_tasks
    set
      status = 'completed',
      completion_outcome = jsonb_build_object('outcome', 'response_received'),
      completed_at = now(),
      completed_by = p_actor_user_id,
      updated_at = now()
    where merchant_id = p_merchant_id
      and source_metadata ->> 'migration_key' =
        'investigation:' || p_investigation_id::text || ':response'
      and status in ('open', 'in_progress', 'blocked');

    insert into public.work_tasks (
      merchant_id, support_payout_case_id, title, description,
      due_at, priority, status, source, source_metadata
    ) values (
      p_merchant_id, p_case_id,
      'Review investigation response',
      'Apply the structured response to the case evidence and responsibility assessment.',
      now(), 'high', 'open', 'investigation',
      jsonb_build_object(
        'migration_key', 'investigation:' || p_investigation_id::text || ':review',
        'investigation_id', p_investigation_id,
        'task_kind', 'response_review'
      )
    ) on conflict do nothing;

    if v_investigation.is_primary
       and v_case.status::text not in (
         'closed', 'resolved_refunded', 'resolved_won', 'resolved_lost',
         'resolved_denied', 'resolved_exchanged', 'voided'
       ) then
      v_case_expected_version := nullif(p_patch ->> 'case_version', '')::bigint;
      if v_case_expected_version is null then
        raise exception 'case_expected_version_required' using errcode = '22023';
      end if;
      v_case_transition := public.transition_payout_case(
        p_merchant_id, p_case_id, v_case_expected_version,
        jsonb_build_object('status', 'manual_review'),
        'Investigation response received', p_actor_user_id,
        'merchant_manual', 'case.investigation_response_received',
        jsonb_build_object(
          'case_id', p_case_id,
          'investigation_id', p_investigation_id,
          'response_outcome', v_updated.response_outcome
        ),
        array[
          'caseProjection', 'notificationProjection',
          'workflowHandler', 'auditTimelineProjection'
        ]::text[],
        'status_changed',
        jsonb_build_object('investigation_id', p_investigation_id),
        trim(p_idempotency_key) || ':case',
        false, false, false, false
      );
    end if;

  elsif p_action in ('close', 'cancel') then
    if v_investigation.status in ('closed', 'cancelled') then
      raise exception 'investigation_already_final' using errcode = '22023';
    end if;
    if p_action = 'cancel'
       and coalesce(length(trim(p_patch ->> 'closure_reason')), 0) < 5 then
      raise exception 'investigation_cancellation_reason_required' using errcode = '22023';
    end if;
    if p_action = 'close'
       and v_investigation.status = 'waiting_response'
       and (
         p_patch ->> 'response_outcome' <> 'no_response'
         or coalesce(length(trim(p_patch ->> 'closure_reason')), 0) < 5
       ) then
      raise exception 'explicit_no_response_closure_required' using errcode = '22023';
    end if;
    if p_action = 'close'
       and v_investigation.status not in ('waiting_response', 'response_received') then
      raise exception 'investigation_not_reviewable_for_close' using errcode = '22023';
    end if;

    v_new_status := case when p_action = 'cancel' then 'cancelled' else 'closed' end;
    update public.case_clarification_requests
    set
      status = v_new_status,
      response_outcome = case
        when p_action = 'close' and status = 'waiting_response' then 'no_response'
        else response_outcome
      end,
      closure_reason = nullif(trim(p_patch ->> 'closure_reason'), ''),
      closed_at = now(),
      closed_by = p_actor_user_id,
      is_primary = false,
      state_version = state_version + 1
    where id = p_investigation_id
      and merchant_id = p_merchant_id
    returning * into v_updated;
    v_event_type := case
      when p_action = 'cancel' then 'investigation.cancelled'
      else 'investigation.closed'
    end;

    update public.work_tasks
    set
      status = case when p_action = 'cancel' then 'cancelled' else 'completed' end,
      completion_outcome = jsonb_build_object('outcome', v_new_status),
      completed_at = now(),
      completed_by = p_actor_user_id,
      updated_at = now()
    where merchant_id = p_merchant_id
      and source_metadata ->> 'investigation_id' = p_investigation_id::text
      and status in ('open', 'in_progress', 'blocked');

    if v_investigation.is_primary then
      select *
        into v_promoted
      from public.case_clarification_requests
      where merchant_id = p_merchant_id
        and support_payout_case_id = p_case_id
        and id <> p_investigation_id
        and status in ('draft', 'sent', 'waiting_response', 'response_received')
      order by
        case status
          when 'waiting_response' then 0
          when 'response_received' then 1
          else 2
        end,
        coalesce(sent_at, created_at),
        id
      limit 1
      for update;
      if found then
        update public.case_clarification_requests
        set is_primary = true, state_version = state_version + 1
        where id = v_promoted.id
          and merchant_id = p_merchant_id
        returning * into v_promoted;
      end if;

      if v_case.status::text not in (
        'closed', 'resolved_refunded', 'resolved_won', 'resolved_lost',
        'resolved_denied', 'resolved_exchanged', 'voided'
      ) then
        v_case_expected_version := nullif(p_patch ->> 'case_version', '')::bigint;
        if v_case_expected_version is null then
          raise exception 'case_expected_version_required' using errcode = '22023';
        end if;
        v_case_status := case
          when v_promoted.id is null then 'ready_for_decision'::public.claim_status
          when v_promoted.status in ('waiting_response', 'sent')
            then public.investigation_case_status(v_promoted.target_type)
          else 'manual_review'::public.claim_status
        end;
        v_case_transition := public.transition_payout_case(
          p_merchant_id, p_case_id, v_case_expected_version,
          jsonb_build_object('status', v_case_status::text),
          'Primary investigation completed', p_actor_user_id,
          'merchant_manual', 'case.investigation_primary_changed',
          jsonb_build_object(
            'case_id', p_case_id,
            'closed_investigation_id', p_investigation_id,
            'promoted_investigation_id', v_promoted.id
          ),
          array[
            'caseProjection', 'notificationProjection',
            'workflowHandler', 'auditTimelineProjection'
          ]::text[],
          'status_changed',
          jsonb_build_object(
            'investigation_id', p_investigation_id,
            'promoted_investigation_id', v_promoted.id
          ),
          trim(p_idempotency_key) || ':case',
          false, false, false, false
        );
      end if;
    end if;
  end if;

  v_result := to_jsonb(v_updated)
    || jsonb_build_object(
      'replayed', false,
      'case_transition', v_case_transition,
      'promoted_investigation_id', v_promoted.id
    );

  select *
    into v_event
  from public.record_domain_event(
    p_merchant_id,
    v_event_type,
    'case_investigation',
    p_investigation_id,
    trim(p_idempotency_key) || ':event',
    jsonb_build_object(
      'action', p_action,
      'investigation_id', p_investigation_id,
      'case_id', p_case_id,
      'from_status', v_investigation.status,
      'to_status', v_updated.status,
      'target_type', v_updated.target_type,
      'is_primary', v_updated.is_primary,
      'due_at', v_updated.due_at,
      'response_outcome', v_updated.response_outcome,
      'result', v_result
    ),
    null, null, null, 'user', p_actor_user_id, now(), null, null,
    array[
      'caseProjection', 'notificationProjection',
      'workflowHandler', 'auditTimelineProjection'
    ]::text[]
  );

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, actor_user_id, metadata
  ) values (
    p_case_id, p_merchant_id, replace(v_event_type, 'investigation.', 'investigation_'),
    v_case.status, coalesce((v_case_transition ->> 'status')::public.claim_status, v_case.status),
    coalesce(nullif(p_patch ->> 'note', ''), nullif(p_patch ->> 'closure_reason', '')),
    p_actor_user_id,
    jsonb_build_object(
      'investigation_id', p_investigation_id,
      'action', p_action,
      'domain_event_id', v_event.id,
      'idempotency_key', trim(p_idempotency_key)
    )
  );

  return v_result || jsonb_build_object('domain_event_id', v_event.id);
end;
$function$;

revoke all on function public.investigation_case_status(text)
  from public, anon, authenticated;
revoke all on function public.create_case_investigation(
  uuid, uuid, text, text, uuid, text, text, text, text[], text, text, text,
  text, text, timestamptz, boolean, uuid, text
) from public, anon, authenticated;
revoke all on function public.transition_case_investigation(
  uuid, uuid, uuid, bigint, text, jsonb, uuid, text
) from public, anon, authenticated;
grant execute on function public.create_case_investigation(
  uuid, uuid, text, text, uuid, text, text, text, text[], text, text, text,
  text, text, timestamptz, boolean, uuid, text
) to service_role;
grant execute on function public.transition_case_investigation(
  uuid, uuid, uuid, bigint, text, jsonb, uuid, text
) to service_role;

comment on function public.create_case_investigation(
  uuid, uuid, text, text, uuid, text, text, text, text[], text, text, text,
  text, text, timestamptz, boolean, uuid, text
) is 'Creates one merchant-scoped, idempotent investigation draft and semantic domain event.';
comment on function public.transition_case_investigation(
  uuid, uuid, uuid, bigint, text, jsonb, uuid, text
) is 'Atomically transitions an investigation, Work tasks, primary selection, case status, and audit events.';

create table public.case_investigation_attachments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null,
  investigation_id uuid not null,
  file_path text,
  external_url text,
  original_filename text,
  safe_filename text,
  content_type text,
  size_bytes bigint,
  content_hash text,
  safety_status text not null default 'pending',
  safety_detail text,
  evidence_item_id uuid references public.evidence_items(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_investigation_attachments_case_merchant_fkey
    foreign key (support_payout_case_id, merchant_id)
    references public.support_payout_cases (id, merchant_id)
    on delete cascade,
  constraint case_investigation_attachments_investigation_merchant_fkey
    foreign key (investigation_id, merchant_id)
    references public.case_clarification_requests (id, merchant_id)
    on delete cascade,
  constraint case_investigation_attachments_source_check
    check (
      (file_path is not null and external_url is null)
      or (file_path is null and external_url is not null)
    ),
  constraint case_investigation_attachments_status_check
    check (safety_status in ('pending', 'clean', 'rejected', 'failed')),
  constraint case_investigation_attachments_size_check
    check (size_bytes is null or size_bytes between 1 and 10485760),
  constraint case_investigation_attachments_hash_check
    check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$'),
  unique (merchant_id, idempotency_key)
);

create index case_investigation_attachments_investigation_idx
  on public.case_investigation_attachments (
    merchant_id, investigation_id, created_at desc
  );
create index case_investigation_attachments_scan_idx
  on public.case_investigation_attachments (safety_status, created_at)
  where safety_status = 'pending';

create trigger trg_case_investigation_attachments_updated
before update on public.case_investigation_attachments
for each row execute function public.set_updated_at();
create trigger trg_case_investigation_attachments_durable_audit
after insert or update or delete on public.case_investigation_attachments
for each row execute function public.capture_sensitive_audit_event();

alter table public.case_investigation_attachments enable row level security;
revoke all on public.case_investigation_attachments from public, anon, authenticated;
grant select on public.case_investigation_attachments to authenticated;
grant all on public.case_investigation_attachments to service_role;
create policy case_investigation_attachments_member_select
  on public.case_investigation_attachments
  for select to authenticated
  using (public.is_merchant_member(merchant_id));
create policy case_investigation_attachments_service_all
  on public.case_investigation_attachments
  for all to service_role
  using (true) with check (true);

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'investigation-evidence',
  'investigation-evidence',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.case_investigation_attachments is
  'Private response files and validated links. Files remain unusable evidence until safety_status is clean.';
