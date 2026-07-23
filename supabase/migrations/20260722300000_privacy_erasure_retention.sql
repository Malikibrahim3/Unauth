-- Canonical merchant-scoped subject erasure and explicit raw-ingestion retention.
--
-- The erasure transaction removes or redacts direct identifiers while keeping
-- the case, monetary ledger, and audit envelope reconcilable. Time-based
-- retention applies only when an ingestion row already carries an explicit
-- retention_deadline; this migration deliberately invents no legal period.

begin;

-- An IP address cannot be truthfully erased while this legacy column is
-- mandatory. Canonical ingestion already treats it as optional.
alter table public.source_orders alter column browser_ip drop not null;

create table if not exists public.data_subject_erasure_receipts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  subject_reference uuid not null,
  merchant_customer_reference uuid,
  requested_by_user_reference uuid,
  idempotency_key text not null,
  scope_counts jsonb not null default '{}'::jsonb,
  effective_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  meaning text not null default 'Merchant-scoped data subject erasure completed',
  unique (merchant_id, idempotency_key)
);

alter table public.data_subject_erasure_receipts enable row level security;
revoke all on public.data_subject_erasure_receipts from public, anon, authenticated;
grant all on public.data_subject_erasure_receipts to service_role;

create table if not exists public.privacy_storage_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  erasure_receipt_id uuid not null references public.data_subject_erasure_receipts(id) on delete cascade,
  bucket text not null,
  object_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'failed', 'completed', 'dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 8 check (max_attempts > 0),
  next_attempt_at timestamptz not null default now(),
  leased_by text,
  leased_until timestamptz,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (erasure_receipt_id, bucket, object_path)
);

alter table public.privacy_storage_cleanup_jobs enable row level security;
revoke all on public.privacy_storage_cleanup_jobs from public, anon, authenticated;
grant all on public.privacy_storage_cleanup_jobs to service_role;

create index if not exists privacy_storage_cleanup_claim_idx
  on public.privacy_storage_cleanup_jobs(status, next_attempt_at, leased_until)
  where status in ('pending', 'processing', 'failed');
create index if not exists privacy_storage_cleanup_merchant_idx
  on public.privacy_storage_cleanup_jobs(merchant_id, created_at desc);

drop trigger if exists trg_privacy_storage_cleanup_updated on public.privacy_storage_cleanup_jobs;
create trigger trg_privacy_storage_cleanup_updated
  before update on public.privacy_storage_cleanup_jobs
  for each row execute function public.set_updated_at();

alter table public.merchant_customers
  add column if not exists erased_at timestamptz,
  add column if not exists erasure_receipt_id uuid;

alter table public.ingestion_events
  add column if not exists payload_purged_at timestamptz;

create index if not exists ingestion_events_explicit_retention_idx
  on public.ingestion_events(retention_deadline, status)
  where retention_deadline is not null and payload_purged_at is null;

create or replace function public.forbid_data_subject_erasure_receipt_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_privacy_receipt_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception 'data_subject_erasure_receipts is append-only (% not allowed)', tg_op;
end;
$$;

drop trigger if exists trg_data_subject_erasure_receipts_immutable
  on public.data_subject_erasure_receipts;
create trigger trg_data_subject_erasure_receipts_immutable
  before update or delete on public.data_subject_erasure_receipts
  for each row execute function public.forbid_data_subject_erasure_receipt_mutation();

-- Preserve append-only truth while permitting only tightly constrained PII
-- field replacement inside the service-only erasure transaction.
create or replace function public.forbid_domain_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_domain_event_purge', true), '') = 'on' then
    return old;
  end if;
  if tg_op = 'UPDATE'
     and coalesce(current_setting('app.allow_subject_erasure', true), '') = 'on'
     and (to_jsonb(new) - 'payload') = (to_jsonb(old) - 'payload')
     and new.payload = '{"privacy_state":"erased"}'::jsonb then
    return new;
  end if;
  raise exception 'domain_events is append-only (% not allowed)', tg_op;
end;
$$;

create or replace function public.forbid_financial_entry_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_financial_purge', true), '') = 'on' then
    return old;
  end if;
  if tg_op = 'UPDATE'
     and coalesce(current_setting('app.allow_subject_erasure', true), '') = 'on'
     and (to_jsonb(new) - 'metadata') = (to_jsonb(old) - 'metadata')
     and new.metadata = '{"privacy_state":"erased"}'::jsonb then
    return new;
  end if;
  raise exception 'case_financial_entries is append-only (% not allowed)', tg_op;
end;
$$;

create or replace function public.forbid_phase7_history_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_history_purge', true), '') = 'on' then
    return old;
  end if;
  if tg_op = 'UPDATE'
     and coalesce(current_setting('app.allow_subject_erasure', true), '') = 'on' then
    if tg_table_name = 'case_decisions'
       and (to_jsonb(new) - array['reason','rule_snapshot','recommendation_snapshot'])
         = (to_jsonb(old) - array['reason','rule_snapshot','recommendation_snapshot']) then
      return new;
    end if;
    if tg_table_name = 'case_outcomes'
       and (to_jsonb(new) - array['reason','metadata'])
         = (to_jsonb(old) - array['reason','metadata']) then
      return new;
    end if;
  end if;
  raise exception '% is append-only (% not allowed)', tg_table_name, tg_op;
end;
$$;

create or replace function public.forbid_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_history_purge', true), '') = 'on' then
    return old;
  end if;
  if tg_op = 'UPDATE'
     and coalesce(current_setting('app.allow_subject_erasure', true), '') = 'on' then
    if tg_table_name = 'case_comment_events'
       and (to_jsonb(new) - 'body_snapshot') = (to_jsonb(old) - 'body_snapshot') then
      return new;
    end if;
    if tg_table_name = 'claim_events'
       and (to_jsonb(new) - array['note','metadata'])
         = (to_jsonb(old) - array['note','metadata']) then
      return new;
    end if;
    if tg_table_name = 'loss_case_events'
       and (to_jsonb(new) - 'metadata_json') = (to_jsonb(old) - 'metadata_json') then
      return new;
    end if;
    if tg_table_name = 'recovery_case_events'
       and (to_jsonb(new) - array['note','metadata'])
         = (to_jsonb(old) - array['note','metadata']) then
      return new;
    end if;
  end if;
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop function if exists public.claim_privacy_storage_cleanup_jobs(integer, text, integer);
create or replace function public.claim_privacy_storage_cleanup_jobs(
  p_limit integer default 50,
  p_worker_id text default 'privacy-cleanup',
  p_lease_seconds integer default 60,
  p_receipt_id uuid default null
) returns setof public.privacy_storage_cleanup_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.privacy_storage_cleanup_jobs
     set status = 'dead_letter',
         last_error = coalesce(last_error, 'storage cleanup lease expired after final attempt'),
         leased_by = null,
         leased_until = null
   where status = 'processing'
     and leased_until <= now()
     and attempts >= max_attempts;

  return query
  with candidates as (
    select id
      from public.privacy_storage_cleanup_jobs
     where attempts < max_attempts
       and (p_receipt_id is null or erasure_receipt_id = p_receipt_id)
       and (
         (status in ('pending','failed') and next_attempt_at <= now())
         or (status = 'processing' and leased_until <= now())
       )
     order by coalesce(leased_until, next_attempt_at), created_at, id
     for update skip locked
     limit least(greatest(p_limit, 1), 500)
  )
  update public.privacy_storage_cleanup_jobs j
     set status = 'processing',
         attempts = j.attempts + 1,
         leased_by = p_worker_id,
         leased_until = now() + make_interval(secs => greatest(p_lease_seconds, 1))
    from candidates
   where j.id = candidates.id
  returning j.*;
end;
$$;

create or replace function public.complete_privacy_storage_cleanup_job(
  p_job_id uuid,
  p_worker_id text
) returns boolean
language sql
security definer
set search_path = public
as $$
  with completed as (
    update public.privacy_storage_cleanup_jobs
       set status = 'completed', completed_at = now(), last_error = null,
           leased_by = null, leased_until = null
     where id = p_job_id and status = 'processing' and leased_by = p_worker_id
    returning 1
  ) select exists(select 1 from completed);
$$;

create or replace function public.fail_privacy_storage_cleanup_job(
  p_job_id uuid,
  p_worker_id text,
  p_error text
) returns boolean
language sql
security definer
set search_path = public
as $$
  with failed as (
    update public.privacy_storage_cleanup_jobs
       set status = case when attempts >= max_attempts then 'dead_letter' else 'failed' end,
           last_error = left(coalesce(p_error, 'storage cleanup failed'), 1000),
           next_attempt_at = now() + make_interval(secs => least(3600, greatest(5, attempts * attempts * 5))),
           leased_by = null, leased_until = null
     where id = p_job_id and status = 'processing' and leased_by = p_worker_id
    returning 1
  ) select exists(select 1 from failed);
$$;

create or replace function public.erase_merchant_data_subject(
  p_merchant_id uuid,
  p_subject_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_effective_at timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.data_subject_erasure_receipts;
  v_receipt_id uuid := gen_random_uuid();
  v_now timestamptz := coalesce(p_effective_at, now());
  v_merchant_customer_id uuid;
  v_source_customer_ids uuid[] := '{}'::uuid[];
  v_order_ids uuid[] := '{}'::uuid[];
  v_ticket_ids uuid[] := '{}'::uuid[];
  v_case_ids uuid[] := '{}'::uuid[];
  v_loss_ids uuid[] := '{}'::uuid[];
  v_recovery_ids uuid[] := '{}'::uuid[];
  v_identity_ids uuid[] := '{}'::uuid[];
  v_evidence_ids uuid[] := '{}'::uuid[];
  v_job_ids uuid[] := '{}'::uuid[];
  v_ingestion_ids uuid[] := '{}'::uuid[];
  v_signal_hashes text[] := '{}'::text[];
  v_storage_paths jsonb := '[]'::jsonb;
  v_counts jsonb;
begin
  if p_merchant_id is null or p_subject_id is null
     or nullif(btrim(p_idempotency_key), '') is null
     or length(p_idempotency_key) > 200 then
    raise exception 'invalid_subject_erasure_request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'privacy-erasure:' || p_merchant_id::text || ':' || p_idempotency_key, 0
  ));

  select * into v_existing
    from public.data_subject_erasure_receipts
   where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'receipt_id', v_existing.id,
      'subject_reference', v_existing.subject_reference,
      'merchant_customer_reference', v_existing.merchant_customer_reference,
      'counts', v_existing.scope_counts,
      'replayed', true
    );
  end if;

  select id into v_merchant_customer_id
    from public.merchant_customers
   where merchant_id = p_merchant_id and id = p_subject_id
   for update;

  if v_merchant_customer_id is null then
    select merchant_customer_id into v_merchant_customer_id
      from public.source_customers
     where merchant_id = p_merchant_id and id = p_subject_id
     for update;
  end if;

  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_source_customer_ids
    from public.source_customers
   where merchant_id = p_merchant_id
     and (
       (v_merchant_customer_id is not null and merchant_customer_id = v_merchant_customer_id)
       or id = p_subject_id
     );

  if v_merchant_customer_id is null and cardinality(v_source_customer_ids) = 0 then
    raise exception 'subject_not_found' using errcode = 'P0002';
  end if;

  if v_merchant_customer_id is not null then
    perform 1 from public.merchant_customers
     where merchant_id = p_merchant_id and id = v_merchant_customer_id
     for update;
    if not found then
      raise exception 'subject_not_found' using errcode = 'P0002';
    end if;
  end if;

  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_order_ids
    from public.source_orders
   where merchant_id = p_merchant_id
     and (
       (v_merchant_customer_id is not null and merchant_customer_id = v_merchant_customer_id)
       or source_customer_id = any(v_source_customer_ids)
     );

  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_ticket_ids
    from public.source_tickets
   where merchant_id = p_merchant_id
     and (
       (v_merchant_customer_id is not null and merchant_customer_id = v_merchant_customer_id)
       or source_customer_id = any(v_source_customer_ids)
     );

  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_case_ids
    from public.support_payout_cases
   where merchant_id = p_merchant_id
     and (
       (v_merchant_customer_id is not null and merchant_customer_id = v_merchant_customer_id)
       or source_order_id = any(v_order_ids)
       or source_ticket_id = any(v_ticket_ids)
     );

  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_loss_ids from public.loss_cases
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_recovery_ids from public.recovery_cases
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);

  select coalesce(array_agg(distinct identity_id), '{}'::uuid[])
    into v_identity_ids
    from (
      select identity_id from public.merchant_customers
       where merchant_id = p_merchant_id and id = v_merchant_customer_id
      union all
      select identity_id from public.support_payout_cases
       where merchant_id = p_merchant_id and id = any(v_case_ids)
    ) identities
   where identity_id is not null;

  select coalesce(array_agg(distinct identifier_hash), '{}'::text[])
    into v_signal_hashes
    from (
      select identifier_hash from public.merchant_customer_signals
       where merchant_id = p_merchant_id and merchant_customer_id = v_merchant_customer_id
      union all
      select identifier_hash from public.identity_signals
       where merchant_id = p_merchant_id
         and (source_customer_id = any(v_source_customer_ids)
           or source_order_id = any(v_order_ids)
           or source_ticket_id = any(v_ticket_ids))
    ) hashes
   where nullif(identifier_hash, '') is not null;

  select coalesce(array_agg(distinct evidence_id), '{}'::uuid[])
    into v_evidence_ids
    from (
      select e.id as evidence_id
        from public.evidence_items e
       where e.merchant_id = p_merchant_id and e.claim_id = any(v_case_ids)
      union
      select l.evidence_item_id
        from public.evidence_links l
       where l.merchant_id = p_merchant_id
         and (l.support_payout_case_id = any(v_case_ids)
           or l.source_order_id = any(v_order_ids)
           or l.source_ticket_id = any(v_ticket_ids))
    ) evidence;

  select coalesce(array_agg(distinct job_id), '{}'::uuid[])
    into v_job_ids from public.source_orders
   where merchant_id = p_merchant_id and id = any(v_order_ids) and job_id is not null;

  select coalesce(array_agg(distinct ingestion_event_id), '{}'::uuid[])
    into v_ingestion_ids
    from public.domain_events
   where merchant_id = p_merchant_id
     and ingestion_event_id is not null
     and aggregate_id = any(
       v_source_customer_ids || v_order_ids || v_ticket_ids || v_case_ids || v_loss_ids || v_recovery_ids
     );

  select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'object_path', object_path)), '[]'::jsonb)
    into v_storage_paths
    from (
      select distinct bucket, object_path
      from (
        select 'evidence-packages'::text bucket, storage_path::text object_path
          from public.evidence_items
         where merchant_id = p_merchant_id and id = any(v_evidence_ids)
        union all
        select 'evidence-packages', storage_path
          from public.claim_evidence
         where merchant_id = p_merchant_id and claim_id = any(v_case_ids)
        union all
        select 'evidence-packages', pdf_storage_path
          from public.evidence_packages
         where merchant_id = p_merchant_id
           and (customer_profile_id = any(v_source_customer_ids)
             or generated_for_order_id = any(v_order_ids))
        union all
        select 'pack-confirmation-photos', photo_url
          from public.pack_confirmations
         where merchant_id = p_merchant_id
           and order_id in (
             select coalesce(order_number, external_id) from public.source_orders
              where merchant_id = p_merchant_id and id = any(v_order_ids)
           )
        union all
        select 'merchant-csv-uploads-2', storage_path
          from public.sync_jobs
         where merchant_id = p_merchant_id and id = any(v_job_ids)
      ) paths
      where nullif(object_path, '') is not null
    ) unique_paths;

  -- Suppress ordinary mutation audit fan-out: this transaction writes its own
  -- immutable receipt, and ordinary change events could retain the PII fields
  -- being erased. The append-only event/financial rows are redacted only via
  -- their narrow trigger exceptions below.
  perform set_config('app.allow_subject_erasure', 'on', true);
  perform set_config('app.allow_domain_event_purge', 'on', true);
  perform set_config('app.allow_history_purge', 'on', true);

  delete from public.merchant_customer_signals
   where merchant_id = p_merchant_id and merchant_customer_id = v_merchant_customer_id;
  delete from public.identity_signals
   where merchant_id = p_merchant_id
     and (source_customer_id = any(v_source_customer_ids)
       or source_order_id = any(v_order_ids)
       or source_ticket_id = any(v_ticket_ids));
  delete from public.identity_edges
   where merchant_id = p_merchant_id
     and (left_hash = any(v_signal_hashes) or right_hash = any(v_signal_hashes));
  delete from public.customer_identity_signals
   where merchant_id = p_merchant_id
     and (customer_email_hash = any(v_signal_hashes)
       or phone_hash = any(v_signal_hashes)
       or shipping_address_hash = any(v_signal_hashes)
       or billing_address_hash = any(v_signal_hashes)
       or ip_hash = any(v_signal_hashes));
  delete from public.customer_claim_summary
   where merchant_id = p_merchant_id and customer_email_hash = any(v_signal_hashes);
  delete from public.identity_link_candidates
   where (merchant_id_a = p_merchant_id or merchant_id_b = p_merchant_id)
     and (primary_customer_email_hash = any(v_signal_hashes)
       or linked_customer_email_hash = any(v_signal_hashes));

  update public.merchant_identity_state
     set on_watchlist = false, display_name = null, display_email = null
   where merchant_id = p_merchant_id and identity_id = any(v_identity_ids);
  update public.identity_notes
     set body = '[redacted by data subject erasure]', deleted_at = coalesce(deleted_at, v_now)
   where merchant_id = p_merchant_id and identity_id = any(v_identity_ids);
  update public.access_audit_log
     set queried_hashes = '{}'
   where merchant_id = p_merchant_id and queried_hashes && v_signal_hashes;
  update public.identity_catch_events
     set profile_id = null,
         submitted_identifier_hash = repeat('0', 64),
         linked_identifier_hash = repeat('0', 64),
         submitted_identifier_display = null,
         linked_identifier_display = null,
         matched_signal_types = '{}'
   where merchant_id = p_merchant_id
     and (claim_id = any(v_case_ids) or order_id = any(v_order_ids)
       or profile_id = any(v_identity_ids));

  update public.record_match_candidates
     set evidence = '{"privacy_state":"erased"}'::jsonb, status = 'superseded'
   where merchant_id = p_merchant_id
     and (
       (subject_entity_type = 'source_customer' and subject_entity_id = any(v_source_customer_ids))
       or (subject_entity_type = 'source_order' and subject_entity_id = any(v_order_ids))
       or (subject_entity_type = 'source_ticket' and subject_entity_id = any(v_ticket_ids))
       or (candidate_entity_type = 'merchant_customer' and candidate_entity_id = v_merchant_customer_id)
     );
  update public.record_match_resolutions r
     set reason = '[redacted by data subject erasure]',
         metadata = '{"privacy_state":"erased"}'::jsonb
   where r.merchant_id = p_merchant_id
     and (
       (r.subject_entity_type = 'source_customer' and r.subject_entity_id = any(v_source_customer_ids))
       or (r.subject_entity_type = 'source_order' and r.subject_entity_id = any(v_order_ids))
       or (r.subject_entity_type = 'source_ticket' and r.subject_entity_id = any(v_ticket_ids))
       or r.selected_candidate_id in (
         select id from public.record_match_candidates
          where merchant_id = p_merchant_id
            and candidate_entity_type = 'merchant_customer'
            and candidate_entity_id = v_merchant_customer_id
       )
     );

  update public.source_addresses
     set line1 = null, line2 = null, city = null, region = null,
         postal_code = null, country = null, phone = null, normalized_full = null
   where merchant_id = p_merchant_id and source_customer_id = any(v_source_customer_ids);

  update public.source_customers
     set external_id = 'erased:' || id::text,
         email = null, phone = null, first_name = null, last_name = null,
         verified_email = null, account_created_at = null, orders_count = null,
         total_spent = null, tags = '[]'::jsonb, note = null,
         linked_platform_customer_external_id = null,
         other_emails = '[]'::jsonb,
         raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and id = any(v_source_customer_ids);

  update public.source_orders
     set email = null, phone = null, customer_email = null, customer_name = null,
         card_last4 = null, browser_ip = null, user_agent = null,
         accept_language = null, landing_site = null, referring_site = null,
         discount_codes = '[]'::jsonb, note = null, tags = '[]'::jsonb,
         shipping_address_id = null, billing_address_id = null
   where merchant_id = p_merchant_id and id = any(v_order_ids);
  update public.source_order_lines set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_order_id = any(v_order_ids);
  update public.source_payments set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id
     and (source_order_id = any(v_order_ids) or source_customer_id = any(v_source_customer_ids));
  update public.source_replacements set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id
     and (source_order_id = any(v_order_ids) or support_payout_case_id = any(v_case_ids));
  update public.source_returns set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id
     and (source_order_id = any(v_order_ids) or support_payout_case_id = any(v_case_ids));
  update public.source_shipments set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_order_id = any(v_order_ids);
  update public.source_transactions set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_order_id = any(v_order_ids);
  update public.source_tracking_events
     set location_text = null, description = null,
         raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_shipment_id in (
     select id from public.source_shipments
      where merchant_id = p_merchant_id and source_order_id = any(v_order_ids)
   );

  update public.source_tickets
     set external_url = null, subject = null, tags = '[]'::jsonb,
         linked_order_external_ids = '[]'::jsonb
   where merchant_id = p_merchant_id and id = any(v_ticket_ids);
  update public.source_messages
     set summary = null, body_ref = null, attachment_metadata = '[]'::jsonb,
         raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_ticket_id = any(v_ticket_ids);
  update public.source_ticket_events
     set summary = null, extracted_identifiers = '{}'::jsonb,
         metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_ticket_id = any(v_ticket_ids);

  update public.source_records
     set source_url = null, source_metadata = '{"privacy_state":"erased"}'::jsonb,
         external_id = case when canonical_entity_type in ('customer','source_customer')
           then 'erased:' || id::text else external_id end
   where merchant_id = p_merchant_id
     and canonical_entity_id = any(v_source_customer_ids || v_order_ids || v_ticket_ids);

  update public.ingestion_events
     set payload = null, payload_ref = null, last_error = null, payload_purged_at = v_now
   where merchant_id = p_merchant_id and id = any(v_ingestion_ids);
  delete from public.ingestion_field_errors
   where merchant_id = p_merchant_id and ingestion_event_id = any(v_ingestion_ids);

  update public.support_case_intake
     set external_url = null, customer_email_hash = null, customer_identifier = null,
         claim_reason = null, customer_message_summary = null, agent_notes_summary = null,
         attachments_metadata = '[]'::jsonb, tags = '[]'::jsonb,
         link_metadata = '{"privacy_state":"erased"}'::jsonb,
         macros_used = '[]'::jsonb
   where merchant_id = p_merchant_id
     and (customer_profile_id = any(v_source_customer_ids) or merchant_claim_id = any(v_case_ids));

  update public.support_payout_cases
     set identity_id = null, detection_detail = '{"privacy_state":"erased"}'::jsonb,
         reason_raw = null, recovery_next_action = null, next_action_reason = null,
         manual_reference = null, manual_source_url = null
   where merchant_id = p_merchant_id and id = any(v_case_ids);
  update public.claim_events
     set note = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.claim_outcomes set notes = null
   where claim_id = any(v_case_ids);
  update public.case_comments
     set body = '[redacted by data subject erasure]', deleted_at = coalesce(deleted_at, v_now)
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.case_comment_events
     set body_snapshot = '[redacted by data subject erasure]'
   where merchant_id = p_merchant_id and comment_id in (
     select id from public.case_comments
      where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids)
   );
  update public.case_decisions
     set reason = null,
         rule_snapshot = '{"privacy_state":"erased"}'::jsonb,
         recommendation_snapshot = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.case_outcomes
     set reason = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.case_financial_entries
     set metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.case_exceptions
     set detail = null, context = '{"privacy_state":"erased"}'::jsonb,
         resolution = null
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.case_clarification_requests
     set target_name = null, request_summary = '[redacted by data subject erasure]',
         response_summary = null
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.accountability_events
     set description = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.agreement_rule_evaluations
     set evaluation_summary = null, result = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.rule_evaluations
     set identity_id = null, source_ticket_id = null,
         matched_conditions = '{"privacy_state":"erased"}'::jsonb,
         all_rules_evaluated = '[]'::jsonb, justification_summary = null,
         rule_snapshot = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);

  update public.evidence_items
     set title = null, summary = null, raw_payload = null, external_url = null,
         proves = null, source_url = null, storage_path = null,
         structured_value = '{"privacy_state":"erased"}'::jsonb,
         source_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and id = any(v_evidence_ids);
  update public.claim_evidence
     set storage_path = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.integration_evidence_items
     set title = '[redacted by data subject erasure]', summary = null,
         value = '{"privacy_state":"erased"}'::jsonb, raw_reference = null
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.evidence_packages
     set pdf_storage_path = null, narrative_summary = null,
         signal_snapshot = '[]'::jsonb, ce3_qualifying_signals = '[]'::jsonb,
         ce3_prior_transactions = '[]'::jsonb, merchant_notes = null
   where merchant_id = p_merchant_id
     and (customer_profile_id = any(v_source_customer_ids)
       or generated_for_order_id = any(v_order_ids));
  delete from public.profile_view_tokens
   where merchant_id = p_merchant_id and profile_id = any(v_source_customer_ids);
  delete from public.evidence_download_tokens
   where merchant_id = p_merchant_id and evidence_id = any(v_evidence_ids);

  update public.loss_sources
     set evidence_summary = null, accountable_party_name = null
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.loss_cases
     set customer_identity_id = null, counterparty_name = null,
         source_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and id = any(v_loss_ids);
  update public.loss_case_events
     set metadata_json = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and loss_case_id = any(v_loss_ids);
  update public.loss_case_evidence
     set source_thread_id = null, source_url = null,
         value_json = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and loss_case_id = any(v_loss_ids);
  update public.external_correspondence
     set counterparty_name = null, source_thread_id = null, source_url = null,
         subject = null, attachment_hashes = '{}', extracted_facts_json = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and loss_case_id = any(v_loss_ids);
  update public.external_clarification_requests
     set counterparty_name = null, recipient_or_endpoint = null, subject = null,
         source_message_id = null, source_thread_id = null
   where merchant_id = p_merchant_id and loss_case_id = any(v_loss_ids);

  update public.recovery_cases
     set rejection_reason = null, calculation_reason = '{}', excluded_costs = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and id = any(v_recovery_ids);
  update public.recovery_case_events
     set note = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and recovery_case_id = any(v_recovery_ids);
  update public.recovery_tasks
     set owner_name = null, owner_email = null, external_reference = null, notes = null
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.work_tasks
     set title = 'Privacy-redacted task', description = null, blocking_reason = null,
         completion_outcome = '{"privacy_state":"erased"}'::jsonb,
         source_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id
     and (support_payout_case_id = any(v_case_ids) or loss_case_id = any(v_loss_ids)
       or recovery_case_id = any(v_recovery_ids));
  update public.connector_action_runs
     set payload = '{"privacy_state":"erased"}'::jsonb,
         result = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.context_credit_events
     set ticket_ref = null, order_ref = null, customer_ref = null,
         reason = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.notifications
     set title = 'Case activity updated', body = null
   where merchant_id = p_merchant_id and domain_event_id in (
     select id from public.domain_events
      where merchant_id = p_merchant_id and aggregate_id = any(v_case_ids)
   );

  update public.sync_jobs
     set label = null, storage_path = null, column_map = null,
         error_log = '[]'::jsonb, cursor = null, hidden = true
   where merchant_id = p_merchant_id and id = any(v_job_ids);
  update public.sync_job_chunks
     set last_error = null
   where job_id = any(v_job_ids);

  update public.pack_confirmations
     set confirmed_by = null, photo_url = null
   where merchant_id = p_merchant_id
     and order_id in (
       select coalesce(order_number, external_id) from public.source_orders
        where merchant_id = p_merchant_id and id = any(v_order_ids)
     );

  update public.domain_events
     set payload = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id
     and (
       ingestion_event_id = any(v_ingestion_ids)
       or aggregate_id = any(
         v_source_customer_ids || v_order_ids || v_ticket_ids || v_case_ids || v_loss_ids || v_recovery_ids
       )
     );

  update public.merchant_customers
     set identity_id = null, display_name = null, email = null,
         raw_metadata = '{"privacy_state":"erased"}'::jsonb,
         matcher_version = 'erased-v1', last_resolved_at = null,
         erased_at = coalesce(erased_at, v_now), erasure_receipt_id = v_receipt_id
   where merchant_id = p_merchant_id and id = v_merchant_customer_id;

  -- Remove a now-orphaned global pseudonymous identity only when no merchant
  -- or case still references it. Shared identities remain intact for the other
  -- merchant; this erasure only severs the requesting merchant's links.
  delete from public.identities i
   where i.id = any(v_identity_ids)
     and not exists (select 1 from public.merchant_customers mc where mc.identity_id = i.id)
     and not exists (select 1 from public.support_payout_cases c where c.identity_id = i.id)
     and not exists (select 1 from public.merchant_identity_state s where s.identity_id = i.id);

  v_counts := jsonb_build_object(
    'source_customers', cardinality(v_source_customer_ids),
    'orders_preserved', cardinality(v_order_ids),
    'tickets_preserved', cardinality(v_ticket_ids),
    'cases_preserved', cardinality(v_case_ids),
    'evidence_records_redacted', cardinality(v_evidence_ids),
    'ingestion_payloads_redacted', cardinality(v_ingestion_ids),
    'financial_entries_preserved', (
      select count(*) from public.case_financial_entries
       where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids)
    ),
    'audit_events_preserved', (
      select count(*) from public.domain_events
       where merchant_id = p_merchant_id
         and aggregate_id = any(v_case_ids || v_order_ids || v_ticket_ids)
    ),
    'storage_objects_queued', jsonb_array_length(v_storage_paths)
  );

  insert into public.data_subject_erasure_receipts (
    id, merchant_id, subject_reference, merchant_customer_reference,
    requested_by_user_reference, idempotency_key, scope_counts, effective_at
  ) values (
    v_receipt_id, p_merchant_id, p_subject_id, v_merchant_customer_id,
    p_actor_user_id, p_idempotency_key, v_counts, v_now
  );

  insert into public.privacy_storage_cleanup_jobs (
    merchant_id, erasure_receipt_id, bucket, object_path
  )
  select p_merchant_id, v_receipt_id, path.bucket, path.object_path
    from jsonb_to_recordset(v_storage_paths) as path(bucket text, object_path text)
  on conflict (erasure_receipt_id, bucket, object_path) do nothing;

  return jsonb_build_object(
    'receipt_id', v_receipt_id,
    'subject_reference', p_subject_id,
    'merchant_customer_reference', v_merchant_customer_id,
    'counts', v_counts,
    'replayed', false
  );
end;
$$;

-- Raw inbox retention is deliberately payload-only. The immutable event
-- envelope remains because domain_events can reference it; financial and audit
-- history are not silently destroyed. Rows with external payload_ref values are
-- reported but not purged until a bucket/path contract exists.
create or replace function public.purge_expired_ingestion_payloads(
  p_limit integer default 500
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[] := '{}'::uuid[];
  v_purged integer := 0;
  v_errors_deleted integer := 0;
  v_external_refs_blocked integer := 0;
begin
  select coalesce(array_agg(id), '{}'::uuid[])
    into v_ids
    from (
      select id
        from public.ingestion_events
       where retention_deadline is not null
         and retention_deadline <= now()
         and payload_purged_at is null
         and payload_ref is null
         and status in ('normalized','dead_letter','ignored')
       order by retention_deadline, id
       for update skip locked
       limit least(greatest(p_limit, 1), 5000)
    ) due;

  delete from public.ingestion_field_errors where ingestion_event_id = any(v_ids);
  get diagnostics v_errors_deleted = row_count;

  update public.ingestion_events
     set payload = null, last_error = null, payload_purged_at = now()
   where id = any(v_ids);
  get diagnostics v_purged = row_count;

  select count(*) into v_external_refs_blocked
    from public.ingestion_events
   where retention_deadline is not null
     and retention_deadline <= now()
     and payload_purged_at is null
     and payload_ref is not null
     and status in ('normalized','dead_letter','ignored');

  return jsonb_build_object(
    'payloads_purged', v_purged,
    'field_errors_deleted', v_errors_deleted,
    'external_payload_refs_blocked', v_external_refs_blocked
  );
end;
$$;

create or replace function public.purge_merchant_privacy_records(p_merchant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_privacy_receipt_purge', 'on', true);
  delete from public.data_subject_erasure_receipts where merchant_id = p_merchant_id;
end;
$$;

revoke all on function public.forbid_data_subject_erasure_receipt_mutation() from public, anon, authenticated;
revoke all on function public.claim_privacy_storage_cleanup_jobs(integer, text, integer, uuid) from public, anon, authenticated;
revoke all on function public.complete_privacy_storage_cleanup_job(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_privacy_storage_cleanup_job(uuid, text, text) from public, anon, authenticated;
revoke all on function public.erase_merchant_data_subject(uuid, uuid, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.purge_expired_ingestion_payloads(integer) from public, anon, authenticated;
revoke all on function public.purge_merchant_privacy_records(uuid) from public, anon, authenticated;

grant execute on function public.claim_privacy_storage_cleanup_jobs(integer, text, integer, uuid) to service_role;
grant execute on function public.complete_privacy_storage_cleanup_job(uuid, text) to service_role;
grant execute on function public.fail_privacy_storage_cleanup_job(uuid, text, text) to service_role;
grant execute on function public.erase_merchant_data_subject(uuid, uuid, uuid, text, timestamptz) to service_role;
grant execute on function public.purge_expired_ingestion_payloads(integer) to service_role;
grant execute on function public.purge_merchant_privacy_records(uuid) to service_role;

notify pgrst, 'reload schema';
commit;
