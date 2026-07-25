-- Release 1 investigation privacy extension.
--
-- The canonical subject-erasure function predates the expanded investigation
-- lifecycle. Wrap it in the same database transaction so investigation
-- messages, responses, references, event payloads, and private objects are
-- redacted atomically with the rest of the subject.

create or replace function public.protect_sent_case_investigation_snapshot()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if coalesce(current_setting('app.allow_subject_erasure', true), '') = 'on' then
    return new;
  end if;
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

create or replace function public.redact_release1_investigation_subject(
  p_merchant_id uuid,
  p_subject_id uuid,
  p_erasure_receipt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_merchant_customer_id uuid;
  v_source_customer_ids uuid[] := '{}'::uuid[];
  v_order_ids uuid[] := '{}'::uuid[];
  v_ticket_ids uuid[] := '{}'::uuid[];
  v_case_ids uuid[] := '{}'::uuid[];
  v_investigation_ids uuid[] := '{}'::uuid[];
  v_investigations_redacted integer := 0;
  v_attachments_redacted integer := 0;
  v_dispatches_redacted integer := 0;
  v_events_redacted integer := 0;
  v_storage_objects_queued integer := 0;
begin
  if p_merchant_id is null
     or p_subject_id is null
     or p_erasure_receipt_id is null then
    raise exception 'release1_erasure_identifiers_required' using errcode = '22023';
  end if;

  select receipt.merchant_customer_reference
    into v_merchant_customer_id
  from public.data_subject_erasure_receipts receipt
  where receipt.id = p_erasure_receipt_id
    and receipt.merchant_id = p_merchant_id
    and receipt.subject_reference = p_subject_id;
  if not found then
    raise exception 'release1_erasure_receipt_not_found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(customer.id order by customer.id), '{}'::uuid[])
    into v_source_customer_ids
  from public.source_customers customer
  where customer.merchant_id = p_merchant_id
    and (
      customer.id = p_subject_id
      or (
        v_merchant_customer_id is not null
        and customer.merchant_customer_id = v_merchant_customer_id
      )
    );

  select coalesce(array_agg(source_order.id order by source_order.id), '{}'::uuid[])
    into v_order_ids
  from public.source_orders source_order
  where source_order.merchant_id = p_merchant_id
    and (
      source_order.source_customer_id = any(v_source_customer_ids)
      or (
        v_merchant_customer_id is not null
        and source_order.merchant_customer_id = v_merchant_customer_id
      )
    );

  select coalesce(array_agg(ticket.id order by ticket.id), '{}'::uuid[])
    into v_ticket_ids
  from public.source_tickets ticket
  where ticket.merchant_id = p_merchant_id
    and (
      ticket.source_customer_id = any(v_source_customer_ids)
      or (
        v_merchant_customer_id is not null
        and ticket.merchant_customer_id = v_merchant_customer_id
      )
    );

  select coalesce(array_agg(payout_case.id order by payout_case.id), '{}'::uuid[])
    into v_case_ids
  from public.support_payout_cases payout_case
  where payout_case.merchant_id = p_merchant_id
    and (
      payout_case.source_order_id = any(v_order_ids)
      or payout_case.source_ticket_id = any(v_ticket_ids)
      or (
        v_merchant_customer_id is not null
        and payout_case.merchant_customer_id = v_merchant_customer_id
      )
    );

  select coalesce(array_agg(investigation.id order by investigation.id), '{}'::uuid[])
    into v_investigation_ids
  from public.case_clarification_requests investigation
  where investigation.merchant_id = p_merchant_id
    and investigation.support_payout_case_id = any(v_case_ids);

  perform set_config('app.allow_subject_erasure', 'on', true);
  perform set_config('app.allow_domain_event_purge', 'on', true);

  insert into public.privacy_storage_cleanup_jobs (
    merchant_id,
    erasure_receipt_id,
    bucket,
    object_path
  )
  select
    p_merchant_id,
    p_erasure_receipt_id,
    'investigation-evidence',
    attachment.file_path
  from public.case_investigation_attachments attachment
  where attachment.merchant_id = p_merchant_id
    and attachment.investigation_id = any(v_investigation_ids)
    and nullif(attachment.file_path, '') is not null
    and attachment.file_path not like 'privacy-erased/%'
  on conflict (erasure_receipt_id, bucket, object_path) do nothing;
  get diagnostics v_storage_objects_queued = row_count;

  update public.case_investigation_dispatches dispatch
  set
    idempotency_key = 'privacy-erased:' || dispatch.id::text,
    last_error = null
  where dispatch.merchant_id = p_merchant_id
    and dispatch.investigation_id = any(v_investigation_ids);
  get diagnostics v_dispatches_redacted = row_count;

  update public.case_investigation_attachments attachment
  set
    file_path = 'privacy-erased/' || attachment.id::text,
    external_url = null,
    original_filename = null,
    safe_filename = null,
    content_type = null,
    size_bytes = null,
    content_hash = null,
    safety_status = 'rejected',
    safety_detail = 'Redacted by data subject erasure',
    idempotency_key = 'privacy-erased:' || attachment.id::text
  where attachment.merchant_id = p_merchant_id
    and attachment.investigation_id = any(v_investigation_ids);
  get diagnostics v_attachments_redacted = row_count;

  update public.case_clarification_requests investigation
  set
    target_name = null,
    evidence_gap = '[redacted by data subject erasure]',
    recommended_reason = null,
    override_rationale = null,
    requested_evidence = array['privacy_redacted']::text[],
    request_summary = '[redacted by data subject erasure]',
    subject = '[redacted by data subject erasure]',
    request_body = '[redacted by data subject erasure]',
    recipient = null,
    external_reference = null,
    external_url = null,
    response_body = null,
    response_summary = null,
    responder_name = null,
    closure_reason = null,
    idempotency_key = 'privacy-erased:' || investigation.id::text,
    metadata = '{"privacy_state":"erased"}'::jsonb
  where investigation.merchant_id = p_merchant_id
    and investigation.id = any(v_investigation_ids);
  get diagnostics v_investigations_redacted = row_count;

  update public.notifications notification
  set
    title = 'Case activity updated',
    body = null
  where notification.merchant_id = p_merchant_id
    and notification.domain_event_id in (
      select event.id
      from public.domain_events event
      where event.merchant_id = p_merchant_id
        and event.aggregate_type = 'case_investigation'
        and event.aggregate_id = any(v_investigation_ids)
    );

  update public.domain_events event
  set payload = '{"privacy_state":"erased"}'::jsonb
  where event.merchant_id = p_merchant_id
    and event.aggregate_type = 'case_investigation'
    and event.aggregate_id = any(v_investigation_ids);
  get diagnostics v_events_redacted = row_count;

  return jsonb_build_object(
    'investigations_redacted', v_investigations_redacted,
    'investigation_attachments_redacted', v_attachments_redacted,
    'investigation_dispatches_redacted', v_dispatches_redacted,
    'investigation_events_redacted', v_events_redacted,
    'investigation_storage_objects_queued', v_storage_objects_queued
  );
end;
$function$;

create or replace function public.erase_release1_merchant_data_subject(
  p_merchant_id uuid,
  p_subject_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_effective_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_result jsonb;
  v_release1_counts jsonb;
begin
  v_result := public.erase_merchant_data_subject(
    p_merchant_id,
    p_subject_id,
    p_actor_user_id,
    p_idempotency_key,
    p_effective_at
  );
  v_release1_counts := public.redact_release1_investigation_subject(
    p_merchant_id,
    p_subject_id,
    (v_result ->> 'receipt_id')::uuid
  );
  return jsonb_set(
    v_result,
    '{counts}',
    coalesce(v_result -> 'counts', '{}'::jsonb) || v_release1_counts,
    true
  );
end;
$function$;

revoke all on function public.redact_release1_investigation_subject(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.erase_release1_merchant_data_subject(
  uuid, uuid, uuid, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.erase_release1_merchant_data_subject(
  uuid, uuid, uuid, text, timestamptz
) to service_role;

comment on function public.erase_release1_merchant_data_subject(
  uuid, uuid, uuid, text, timestamptz
) is 'Atomically erases the canonical subject scope and Release 1 investigation content, with durable Storage cleanup jobs.';

notify pgrst, 'reload schema';
