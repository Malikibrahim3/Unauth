\set ON_ERROR_STOP on

begin;
set local client_min_messages = warning;

insert into public.merchants (id, name) values
  ('40000000-0000-4000-8000-000000000010', 'Synthetic privacy merchant A'),
  ('40000000-0000-4000-8000-000000000020', 'Synthetic privacy merchant B');

insert into public.merchant_customers (id, merchant_id, display_name, email, raw_metadata) values
  ('40000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000010', 'Shared Subject', 'shared-subject@example.invalid', '{"private":"merchant-a"}'),
  ('40000000-0000-4000-8000-000000000021', '40000000-0000-4000-8000-000000000020', 'Shared Subject', 'shared-subject@example.invalid', '{"private":"merchant-b"}');

insert into public.source_customers (
  id, merchant_id, source, external_id, email, phone, first_name, last_name,
  note, raw_metadata, merchant_customer_id
) values
  ('40000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000010', 'manual', 'OVERLAP-CUSTOMER', 'shared-subject@example.invalid', '+440000000001', 'Shared', 'Subject', 'private note A', '{"private":"merchant-a"}', '40000000-0000-4000-8000-000000000011'),
  ('40000000-0000-4000-8000-000000000022', '40000000-0000-4000-8000-000000000020', 'manual', 'OVERLAP-CUSTOMER', 'shared-subject@example.invalid', '+440000000001', 'Shared', 'Subject', 'private note B', '{"private":"merchant-b"}', '40000000-0000-4000-8000-000000000021');

insert into public.source_addresses (
  id, merchant_id, source_customer_id, kind, line1, city, postal_code, country, phone, normalized_full
) values
  ('40000000-0000-4000-8000-000000000013', '40000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000012', 'shipping', '1 Private Street', 'London', 'AA1 1AA', 'GB', '+440000000001', '1 private street aa1 1aa'),
  ('40000000-0000-4000-8000-000000000023', '40000000-0000-4000-8000-000000000020', '40000000-0000-4000-8000-000000000022', 'shipping', '2 Untouched Street', 'London', 'BB2 2BB', 'GB', '+440000000002', '2 untouched street bb2 2bb');

insert into public.source_orders (
  id, merchant_id, source, external_id, order_number, source_customer_id,
  email, phone, total_price, currency, card_last4, browser_ip, customer_email,
  customer_name, merchant_customer_id, shipping_address_id, raw_payload_hash
) values
  ('40000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000010', 'manual', 'OVERLAP-ORDER', 'OVERLAP-ORDER', '40000000-0000-4000-8000-000000000012', 'shared-subject@example.invalid', '+440000000001', 12.34, 'GBP', '1234', '192.0.2.40', 'shared-subject@example.invalid', 'Shared Subject', '40000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000013', repeat('a', 64)),
  ('40000000-0000-4000-8000-000000000024', '40000000-0000-4000-8000-000000000020', 'manual', 'OVERLAP-ORDER', 'OVERLAP-ORDER', '40000000-0000-4000-8000-000000000022', 'shared-subject@example.invalid', '+440000000001', 56.78, 'GBP', '5678', '192.0.2.41', 'shared-subject@example.invalid', 'Shared Subject', '40000000-0000-4000-8000-000000000021', '40000000-0000-4000-8000-000000000023', repeat('b', 64));

insert into public.source_tickets (
  id, merchant_id, provider, external_id, external_url, source_customer_id,
  subject, tags, merchant_customer_id
) values
  ('40000000-0000-4000-8000-000000000015', '40000000-0000-4000-8000-000000000010', 'gorgias', 'OVERLAP-TICKET', 'https://example.invalid/private-a', '40000000-0000-4000-8000-000000000012', 'Private ticket A', '["private-a"]', '40000000-0000-4000-8000-000000000011'),
  ('40000000-0000-4000-8000-000000000025', '40000000-0000-4000-8000-000000000020', 'gorgias', 'OVERLAP-TICKET', 'https://example.invalid/private-b', '40000000-0000-4000-8000-000000000022', 'Private ticket B', '["private-b"]', '40000000-0000-4000-8000-000000000021');

insert into public.source_messages (
  id, merchant_id, source_ticket_id, external_id, summary, body_ref, raw_metadata
) values
  ('40000000-0000-4000-8000-000000000016', '40000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000015', 'MESSAGE-A', 'private message A', 'inline:private-a', '{"private":"merchant-a"}'),
  ('40000000-0000-4000-8000-000000000026', '40000000-0000-4000-8000-000000000020', '40000000-0000-4000-8000-000000000025', 'MESSAGE-B', 'private message B', 'inline:private-b', '{"private":"merchant-b"}');

insert into public.support_payout_cases (
  id, merchant_id, source_ticket_id, source_order_id, merchant_customer_id,
  claim_type, reason_raw, reason_normalized, amount_at_risk, currency
) values
  ('40000000-0000-4000-8000-000000000017', '40000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000015', '40000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000011', 'refund_request', 'private reason A', 'customer_request', 12.34, 'GBP'),
  ('40000000-0000-4000-8000-000000000027', '40000000-0000-4000-8000-000000000020', '40000000-0000-4000-8000-000000000025', '40000000-0000-4000-8000-000000000024', '40000000-0000-4000-8000-000000000021', 'refund_request', 'private reason B', 'customer_request', 56.78, 'GBP');

insert into public.case_financial_entries (
  id, merchant_id, support_payout_case_id, state, amount_minor, currency,
  direction, effective_at, recorded_at, metadata
) values
  ('40000000-0000-4000-8000-000000000018', '40000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000017', 'paid', 1234, 'GBP', 'debit', now(), now(), '{"customer_name":"Shared Subject"}'),
  ('40000000-0000-4000-8000-000000000028', '40000000-0000-4000-8000-000000000020', '40000000-0000-4000-8000-000000000027', 'paid', 5678, 'GBP', 'debit', now(), now(), '{"customer_name":"Shared Subject"}');

insert into public.case_decisions (
  id, merchant_id, support_payout_case_id, decision, amount_minor, currency,
  rule_snapshot, recommendation_snapshot, reason, actor_type, effective_at,
  recorded_at, idempotency_key
) values
  ('40000000-0000-4000-8000-000000000019', '40000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000017', 'approved', 1234, 'GBP', '{"private":"merchant-a"}', '{"private":"merchant-a"}', 'private decision A', 'user', now(), now(), 'privacy-decision-a'),
  ('40000000-0000-4000-8000-000000000029', '40000000-0000-4000-8000-000000000020', '40000000-0000-4000-8000-000000000027', 'approved', 5678, 'GBP', '{"private":"merchant-b"}', '{"private":"merchant-b"}', 'private decision B', 'user', now(), now(), 'privacy-decision-b');

insert into public.ingestion_events (
  id, merchant_id, source_system, idempotency_key, payload_hash, payload,
  status, retention_deadline
) values
  ('40000000-0000-4000-8000-000000000031', '40000000-0000-4000-8000-000000000010', 'runtime', 'privacy-ingest-a', repeat('1',64), '{"email":"shared-subject@example.invalid","private":"merchant-a"}', 'normalized', now() + interval '1 day'),
  ('40000000-0000-4000-8000-000000000032', '40000000-0000-4000-8000-000000000020', 'runtime', 'privacy-ingest-b', repeat('2',64), '{"email":"shared-subject@example.invalid","private":"merchant-b"}', 'normalized', now() + interval '1 day'),
  ('40000000-0000-4000-8000-000000000033', '40000000-0000-4000-8000-000000000010', 'runtime', 'privacy-expired-terminal', repeat('3',64), '{"raw":"expired"}', 'normalized', now() - interval '1 day'),
  ('40000000-0000-4000-8000-000000000034', '40000000-0000-4000-8000-000000000010', 'runtime', 'privacy-expired-pending', repeat('4',64), '{"raw":"pending"}', 'pending', now() - interval '1 day'),
  ('40000000-0000-4000-8000-000000000035', '40000000-0000-4000-8000-000000000010', 'runtime', 'privacy-expired-external-ref', repeat('5',64), null, 'normalized', now() - interval '1 day');
update public.ingestion_events set payload_ref = 'uncontracted://payload' where id = '40000000-0000-4000-8000-000000000035';

insert into public.domain_events (
  id, merchant_id, event_type, aggregate_type, aggregate_id, ingestion_event_id,
  idempotency_key, payload
) values
  ('40000000-0000-4000-8000-000000000041', '40000000-0000-4000-8000-000000000010', 'order.ingested', 'order', '40000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000031', 'privacy-domain-a', '{"private":"merchant-a"}'),
  ('40000000-0000-4000-8000-000000000042', '40000000-0000-4000-8000-000000000020', 'order.ingested', 'order', '40000000-0000-4000-8000-000000000024', '40000000-0000-4000-8000-000000000032', 'privacy-domain-b', '{"private":"merchant-b"}');

insert into public.evidence_items (
  id, claim_id, merchant_id, source_system, evidence_type, title, summary,
  raw_payload, storage_path, structured_value, source_metadata
) values
  ('40000000-0000-4000-8000-000000000051', '40000000-0000-4000-8000-000000000017', '40000000-0000-4000-8000-000000000010', 'runtime', 'ticket_messages', 'Private evidence A', 'private summary A', '{"private":"merchant-a"}', '40000000-0000-4000-8000-000000000010/private-a.pdf', '{"private":"merchant-a"}', '{"private":"merchant-a"}'),
  ('40000000-0000-4000-8000-000000000052', '40000000-0000-4000-8000-000000000027', '40000000-0000-4000-8000-000000000020', 'runtime', 'ticket_messages', 'Private evidence B', 'private summary B', '{"private":"merchant-b"}', '40000000-0000-4000-8000-000000000020/private-b.pdf', '{"private":"merchant-b"}', '{"private":"merchant-b"}');

do $acceptance$
declare
  v_result jsonb;
  v_replay jsonb;
  v_retention jsonb;
  v_job public.privacy_storage_cleanup_jobs;
  v_other_claim_count integer;
begin
  if has_function_privilege('anon', 'public.erase_merchant_data_subject(uuid,uuid,uuid,text,timestamp with time zone)', 'execute')
     or has_function_privilege('authenticated', 'public.erase_merchant_data_subject(uuid,uuid,uuid,text,timestamp with time zone)', 'execute')
     or has_function_privilege('authenticated', 'public.purge_expired_ingestion_payloads(integer)', 'execute') then
    raise exception 'privacy maintenance RPC remains client-executable';
  end if;

  select count(*) into v_other_claim_count from public.support_payout_cases
   where merchant_id = '40000000-0000-4000-8000-000000000020';

  v_result := public.erase_merchant_data_subject(
    '40000000-0000-4000-8000-000000000010',
    '40000000-0000-4000-8000-000000000011',
    '40000000-0000-4000-8000-000000000001',
    'runtime-erasure-a',
    now()
  );

  if v_result->>'replayed' <> 'false'
     or (v_result->'counts'->>'source_customers')::integer <> 1
     or (v_result->'counts'->>'cases_preserved')::integer <> 1
     or (v_result->'counts'->>'financial_entries_preserved')::integer <> 1
     or (v_result->'counts'->>'storage_objects_queued')::integer <> 1 then
    raise exception 'erasure result is incomplete: %', v_result;
  end if;

  if not exists (
    select 1 from public.source_customers
     where id = '40000000-0000-4000-8000-000000000012'
       and email is null and phone is null and first_name is null and last_name is null
       and external_id = 'erased:40000000-0000-4000-8000-000000000012'
       and raw_metadata = '{"privacy_state":"erased"}'::jsonb
  ) then raise exception 'merchant A source customer retained direct identifiers'; end if;

  if not exists (
    select 1 from public.source_orders
     where id = '40000000-0000-4000-8000-000000000014'
       and email is null and customer_name is null and browser_ip is null
       and external_id = 'OVERLAP-ORDER' and total_price = 12.34 and currency = 'GBP'
  ) then raise exception 'merchant A order was not pseudonymised while preserving reconciliation'; end if;

  if not exists (
    select 1 from public.case_financial_entries
     where id = '40000000-0000-4000-8000-000000000018'
       and state = 'paid' and amount_minor = 1234 and currency = 'GBP'
       and metadata = '{"privacy_state":"erased"}'::jsonb
  ) then raise exception 'financial history was lost or retained free-form PII'; end if;

  if not exists (
    select 1 from public.case_decisions
     where id = '40000000-0000-4000-8000-000000000019'
       and decision = 'approved' and amount_minor = 1234 and reason is null
       and rule_snapshot = '{"privacy_state":"erased"}'::jsonb
  ) then raise exception 'append-only decision redaction did not preserve the decision'; end if;

  if not exists (
    select 1 from public.domain_events
     where id = '40000000-0000-4000-8000-000000000041'
       and event_type = 'order.ingested'
       and payload = '{"privacy_state":"erased"}'::jsonb
  ) then raise exception 'domain-event envelope was not retained and redacted'; end if;

  if not exists (
    select 1 from public.evidence_items
     where id = '40000000-0000-4000-8000-000000000051'
       and title is null and raw_payload is null and storage_path is null
       and structured_value = '{"privacy_state":"erased"}'::jsonb
  ) then raise exception 'subject evidence was not redacted'; end if;

  if (select count(*) from public.data_subject_erasure_receipts
       where merchant_id = '40000000-0000-4000-8000-000000000010'
         and idempotency_key = 'runtime-erasure-a') <> 1 then
    raise exception 'immutable erasure receipt was not recorded exactly once';
  end if;

  -- Same request is idempotent and returns the original receipt.
  v_replay := public.erase_merchant_data_subject(
    '40000000-0000-4000-8000-000000000010',
    '40000000-0000-4000-8000-000000000011',
    '40000000-0000-4000-8000-000000000001',
    'runtime-erasure-a',
    now()
  );
  if v_replay->>'replayed' <> 'true'
     or v_replay->>'receipt_id' <> v_result->>'receipt_id' then
    raise exception 'erasure replay was not idempotent: %', v_replay;
  end if;

  -- Overlapping external IDs and identifiers in merchant B are untouched.
  if (select count(*) from public.support_payout_cases
       where merchant_id = '40000000-0000-4000-8000-000000000020') <> v_other_claim_count
     or not exists (
       select 1 from public.source_customers
        where id = '40000000-0000-4000-8000-000000000022'
          and email = 'shared-subject@example.invalid'
          and raw_metadata = '{"private":"merchant-b"}'::jsonb
     )
     or not exists (
       select 1 from public.evidence_items
        where id = '40000000-0000-4000-8000-000000000052'
          and title = 'Private evidence B'
          and storage_path is not null
     )
     or not exists (
       select 1 from public.domain_events
        where id = '40000000-0000-4000-8000-000000000042'
          and payload = '{"private":"merchant-b"}'::jsonb
     ) then
    raise exception 'merchant B was changed by merchant A subject erasure';
  end if;

  -- Storage work is leased, fenced, retryable, and observable.
  select * into v_job from public.claim_privacy_storage_cleanup_jobs(10, 'worker-a', 60) limit 1;
  if v_job.id is null or v_job.merchant_id <> '40000000-0000-4000-8000-000000000010'::uuid then
    raise exception 'privacy storage cleanup was not claimed';
  end if;
  if exists (select 1 from public.claim_privacy_storage_cleanup_jobs(10, 'worker-b', 60)) then
    raise exception 'active privacy storage cleanup lease was claimed twice';
  end if;
  if not public.fail_privacy_storage_cleanup_job(v_job.id, 'worker-a', 'synthetic failure') then
    raise exception 'privacy storage cleanup failure was not recorded';
  end if;
  update public.privacy_storage_cleanup_jobs set next_attempt_at = now() where id = v_job.id;
  select * into v_job from public.claim_privacy_storage_cleanup_jobs(10, 'worker-b', 60) limit 1;
  if v_job.id is null or v_job.attempts <> 2 then
    raise exception 'failed privacy storage cleanup was not retried';
  end if;
  if not public.complete_privacy_storage_cleanup_job(v_job.id, 'worker-b') then
    raise exception 'privacy storage cleanup owner could not complete work';
  end if;

  v_retention := public.purge_expired_ingestion_payloads(100);
  if (v_retention->>'payloads_purged')::integer <> 1
     or (v_retention->>'external_payload_refs_blocked')::integer <> 1 then
    raise exception 'explicit-deadline retention result is wrong: %', v_retention;
  end if;
  if not exists (
    select 1 from public.ingestion_events
     where id = '40000000-0000-4000-8000-000000000033'
       and payload is null and payload_purged_at is not null
  ) then raise exception 'expired terminal raw payload was not purged'; end if;
  if not exists (
    select 1 from public.ingestion_events
     where id = '40000000-0000-4000-8000-000000000034'
       and payload = '{"raw":"pending"}'::jsonb and payload_purged_at is null
  ) then raise exception 'retryable pending payload was purged'; end if;
  if not exists (
    select 1 from public.ingestion_events
     where id = '40000000-0000-4000-8000-000000000035'
       and payload_ref = 'uncontracted://payload' and payload_purged_at is null
  ) then raise exception 'uncontracted external payload reference was silently orphaned'; end if;
end;
$acceptance$;

rollback;
\echo 'Privacy erasure, storage cleanup, and explicit retention acceptance passed.'
