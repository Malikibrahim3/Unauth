\set ON_ERROR_STOP on

begin;

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $function$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'source_to_recovery_assertion_failed: %', p_message;
  end if;
end;
$function$;

insert into public.merchants (id, name) values
  ('81000000-0000-4000-8000-000000000001', 'Source-to-recovery merchant A'),
  ('81000000-0000-4000-8000-000000000002', 'Source-to-recovery merchant B');

-- Controlled source intake and canonical matching context. These rows prove
-- that the lifecycle begins with merchant/source-account scoped records rather
-- than a provider-specific or globally keyed case model.
insert into public.source_accounts (
  id, merchant_id, provider_id, external_account_id, display_name,
  is_synthetic, environment, metadata
) values (
  '86000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'controlled-commerce', 'design-partner-store-1', 'Controlled commerce account',
  true, 'test', '{"capabilities":["orders","refunds"]}'
);

insert into public.merchant_customers (
  id, merchant_id, display_name, resolution_status, matcher_version, last_resolved_at
) values (
  '86100000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'Synthetic customer', 'active', 'runtime-v1', now()
);

insert into public.source_customers (
  id, merchant_id, source, external_id, first_name, last_name,
  merchant_customer_id, raw_metadata
) values (
  '86200000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'manual', 'controlled-customer-1', 'Synthetic', 'Customer',
  '86100000-0000-4000-8000-000000000001',
  '{"fixture":"source-to-recovery"}'
);

insert into public.source_orders (
  id, merchant_id, source, external_id, order_number, source_customer_id,
  financial_status, fulfillment_state, total_price, currency, browser_ip,
  placed_at, source_account_id, merchant_customer_id, raw_payload_hash
) values (
  '83000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'manual', 'controlled-order-1', 'CONTROLLED-1001',
  '86200000-0000-4000-8000-000000000001',
  'paid', 'delivered', 50, 'GBP', '127.0.0.1',
  now() - interval '10 days',
  '86000000-0000-4000-8000-000000000001',
  '86100000-0000-4000-8000-000000000001',
  'sha256:controlled-order-1'
);

insert into public.source_tickets (
  id, merchant_id, provider, external_id, source_customer_id, subject,
  status, channel, linked_order_external_ids, created_at_provider,
  updated_at_provider, raw_payload_hash, merchant_customer_id
) values (
  '86300000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'gorgias', 'controlled-ticket-1',
  '86200000-0000-4000-8000-000000000001',
  'Synthetic delivery request', 'open', 'email', '["controlled-order-1"]',
  now() - interval '1 day', now() - interval '1 hour',
  'sha256:controlled-ticket-1',
  '86100000-0000-4000-8000-000000000001'
);

insert into public.source_records (
  id, merchant_id, source_account_id, source_system, source_entity_type,
  external_id, canonical_entity_type, canonical_entity_id, source_url,
  source_created_at, source_updated_at, last_synced_at, sync_state,
  freshness_state, connector_version, payload_hash, source_metadata
) values
  (
    '86400000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001',
    '86000000-0000-4000-8000-000000000001',
    'controlled-commerce', 'order', 'controlled-order-1', 'order',
    '83000000-0000-4000-8000-000000000001',
    'https://controlled.invalid/orders/controlled-order-1',
    now() - interval '10 days', now() - interval '1 hour', now() - interval '1 hour',
    'current', 'fresh', 'runtime-v1', 'sha256:controlled-order-1',
    '{"source_status":"delivered"}'
  ),
  (
    '86400000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000001',
    '86000000-0000-4000-8000-000000000001',
    'controlled-helpdesk', 'ticket', 'controlled-ticket-1', 'ticket',
    '86300000-0000-4000-8000-000000000001',
    'https://controlled.invalid/tickets/controlled-ticket-1',
    now() - interval '1 day', now() - interval '1 hour', now() - interval '1 hour',
    'current', 'fresh', 'runtime-v1', 'sha256:controlled-ticket-1',
    '{"source_status":"open"}'
  );

insert into public.merchant_rules (
  id, merchant_id, name, description, is_active, priority,
  conditions, action, condition_operator
) values (
  '86500000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'Controlled delivered-order review',
  'Require human review before authorizing a delivered-order payout.',
  true, 100,
  '[{"field":"fulfillment_state","operator":"equals","value":"delivered"}]',
  'manual_review', 'and'
);

insert into public.merchant_rule_versions (
  id, merchant_id, merchant_rule_id, version, status, name, description,
  conditions, action, condition_operator, priority, published_at
) values (
  '86600000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  '86500000-0000-4000-8000-000000000001',
  1, 'published', 'Controlled delivered-order review',
  'Require human review before authorizing a delivered-order payout.',
  '[{"field":"fulfillment_state","operator":"equals","value":"delivered"}]',
  'manual_review', 'and', 100, now() - interval '2 days'
);

insert into public.support_payout_cases (
  id, merchant_id, claim_type, status, detection_method, manual_reference,
  source_order_id, source_ticket_id, merchant_customer_id,
  amount_at_risk, currency, primary_currency, requested_action,
  payout_decision_state, recovery_state, state_version,
  loss_attribution, attribution_confidence, recoverability, recovery_owner,
  recommended_payout_action, recommended_rule_name, recommended_rule_id,
  next_action, next_action_reason
) values
  (
    '82000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001',
    'item_not_received', 'manual_review', 'manual', 'runtime-case-a',
    '83000000-0000-4000-8000-000000000001',
    '86300000-0000-4000-8000-000000000001',
    '86100000-0000-4000-8000-000000000001',
    50, 'GBP', 'GBP', 'refund',
    'undecided', 'recovery_submitted', 1,
    'carrier_loss', 'medium', 'recoverable', 'carrier',
    'manual_review', 'Controlled delivered-order review',
    '86500000-0000-4000-8000-000000000001',
    'Review evidence and record merchant decision',
    'Delivered status conflicts with the reported non-receipt.'
  ),
  (
    '82000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000002',
    'item_not_received', 'manual_review', 'manual', 'runtime-case-b',
    null, null, null,
    30, 'GBP', 'GBP', 'refund',
    'undecided', 'no_recovery_needed', 1,
    'unknown', 'needs_more_evidence', 'unknown', 'unknown',
    null, null, null, 'Review available evidence', 'Source coverage is limited.'
  ),
  (
    '82000000-0000-4000-8000-000000000003',
    '81000000-0000-4000-8000-000000000001',
    'refund_request', 'resolved_refunded', 'manual', 'runtime-case-final',
    null, null, null,
    10, 'GBP', 'GBP', 'refund',
    'undecided', 'no_recovery_needed', 1,
    'unknown', 'needs_more_evidence', 'unknown', 'unknown',
    null, null, null, 'Closed', 'Historical final-state fixture.'
  ),
  (
    '82000000-0000-4000-8000-000000000004',
    '81000000-0000-4000-8000-000000000001',
    'other', 'pending', 'manual', 'runtime-case-aged',
    null, null, null,
    5, 'GBP', 'GBP', 'unknown',
    'undecided', 'no_recovery_needed', 1,
    'unknown', 'needs_more_evidence', 'unknown', 'unknown',
    null, null, null, 'Review pending case', 'The case requires attention without changing lifecycle truth.'
  );

insert into public.entity_relationships (
  merchant_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id,
  relationship_type, match_status, match_method, confidence, evidence,
  resolved_at
) values
  (
    '81000000-0000-4000-8000-000000000001', 'case',
    '82000000-0000-4000-8000-000000000001', 'order',
    '83000000-0000-4000-8000-000000000001', 'case_order',
    'confirmed', 'connector_declared', 1, '{"source_record_id":"86400000-0000-4000-8000-000000000001"}', now()
  ),
  (
    '81000000-0000-4000-8000-000000000001', 'case',
    '82000000-0000-4000-8000-000000000001', 'ticket',
    '86300000-0000-4000-8000-000000000001', 'case_ticket',
    'confirmed', 'connector_declared', 1, '{"source_record_id":"86400000-0000-4000-8000-000000000002"}', now()
  ),
  (
    '81000000-0000-4000-8000-000000000001', 'case',
    '82000000-0000-4000-8000-000000000001', 'merchant_customer',
    '86100000-0000-4000-8000-000000000001', 'case_customer',
    'confirmed', 'customer_id', 1,
    '{"source_customer_id":"86200000-0000-4000-8000-000000000001"}', now()
  );

insert into public.evidence_items (
  id, claim_id, merchant_id, source_system, evidence_type, title, summary,
  occurred_at, proves, confidence, source_record_id, source_account_id,
  source_url, source_created_at, source_updated_at, ingested_at,
  last_synced_at, freshness_state, sync_state, content_hash,
  structured_value, source_metadata
) values (
  '86800000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'controlled-commerce', 'delivery_status', 'Carrier delivery status',
  'The controlled source reported the shipment as delivered.',
  now() - interval '2 days', 'delivery_status', 0.95,
  '86400000-0000-4000-8000-000000000001',
  '86000000-0000-4000-8000-000000000001',
  'https://controlled.invalid/orders/controlled-order-1',
  now() - interval '10 days', now() - interval '1 hour', now() - interval '1 hour',
  now() - interval '1 hour', 'fresh', 'current', 'sha256:controlled-evidence-1',
  '{"canonical_status":"delivered","source_status":"DELIVERED"}',
  '{"provider":"controlled-commerce","limitations":["No delivery photo"]}'
);

insert into public.evidence_links (
  merchant_id, evidence_item_id, support_payout_case_id
) values (
  '81000000-0000-4000-8000-000000000001',
  '86800000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001'
);

insert into public.rule_evaluations (
  id, merchant_id, claim_id, rule_id, recommendation, matched_conditions,
  all_rules_evaluated, evaluated_at, evaluation_source, signals_hash,
  context_hash, rules_hash, justification_summary, dedupe_key, rule_snapshot
) values (
  '86700000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  '86500000-0000-4000-8000-000000000001',
  'manual_review',
  '[{"field":"fulfillment_state","observed":"delivered","matched":true}]',
  '[{"rule_id":"86500000-0000-4000-8000-000000000001","version":1,"matched":true}]',
  now() - interval '30 minutes', 'controlled-runtime',
  'sha256:signals-v1', 'sha256:context-v1', 'sha256:rules-v1',
  'Delivered evidence is fresh, but proof of receipt is unavailable; human review is required.',
  'runtime-evaluation-1',
  '{"rule_version_id":"86600000-0000-4000-8000-000000000001","version":1,"facts":{"fulfillment_state":"delivered","delivery_photo":"unavailable"}}'
);

-- Weak-only matching remains explicit work rather than silently linking.
insert into public.record_match_candidates (
  id, merchant_id, subject_entity_type, subject_entity_id,
  candidate_entity_type, candidate_entity_id, match_method, confidence,
  status, evidence
) values (
  '86900000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'source_record', '86400000-0000-4000-8000-000000000002',
  'merchant_customer', '86100000-0000-4000-8000-000000000001',
  'weak_name_only', 0.45, 'open',
  '{"reason":"Only a weak name signal was available"}'
);
insert into public.case_exceptions (
  merchant_id, exception_type, confidence, status, title, detail,
  context, subject_entity_type, subject_entity_id, source_system, dedup_key
) values (
  '81000000-0000-4000-8000-000000000001',
  'match_uncertainty', 'unknown', 'open', 'Customer match needs review',
  'The weak-only candidate must be resolved before a canonical customer link is created.',
  '{"candidate_id":"86900000-0000-4000-8000-000000000001"}',
  'source_record', '86400000-0000-4000-8000-000000000002',
  'controlled-helpdesk', 'runtime-match-uncertainty-1'
);

select pg_temp.assert_true(
  (select count(*) = 2 from public.source_records
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and source_account_id = '86000000-0000-4000-8000-000000000001'
     and freshness_state = 'fresh'),
  'source intake retained account scope, provenance, and freshness'
);
select pg_temp.assert_true(
  (select count(*) = 3 from public.entity_relationships
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and from_entity_id = '82000000-0000-4000-8000-000000000001'
     and match_status = 'confirmed'),
  'case has confirmed customer, order, and ticket relationships'
);
select pg_temp.assert_true(
  (select freshness_state = 'fresh' and source_record_id is not null
          and source_account_id = '86000000-0000-4000-8000-000000000001'
   from public.evidence_items
   where id = '86800000-0000-4000-8000-000000000001'),
  'material evidence retained provenance and freshness'
);
select pg_temp.assert_true(
  (select recommendation = 'manual_review'
          and rule_snapshot ->> 'rule_version_id' = '86600000-0000-4000-8000-000000000001'
          and length(justification_summary) > 20
   from public.rule_evaluations
   where id = '86700000-0000-4000-8000-000000000001'),
  'recommendation retained exact rule version, evaluated facts, and explanation'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.record_match_candidates
   where id = '86900000-0000-4000-8000-000000000001' and status = 'open')
  and
  (select count(*) = 1 from public.case_exceptions
   where dedup_key = 'runtime-match-uncertainty-1' and status = 'open'),
  'weak-only identity evidence produced an explicit ambiguity exception'
);

select public.flag_aged_payout_case(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000004',
  now() + interval '1 day',
  'runtime-aged-case-flag'
);
select public.flag_aged_payout_case(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000004',
  now() + interval '1 day',
  'runtime-aged-case-flag'
);
select pg_temp.assert_true(
  (select status = 'pending' from public.support_payout_cases
   where id = '82000000-0000-4000-8000-000000000004')
  and
  (select count(*) = 1 from public.case_exceptions
   where dedup_key = 'aged-pending-case:82000000-0000-4000-8000-000000000004')
  and
  (select count(*) = 1 from public.domain_events
   where idempotency_key = 'runtime-aged-case-flag'),
  'aged pending work was flagged idempotently without becoming a lifecycle state'
);

select public.record_case_decision(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000004',
  1, 'denied', 'denied', 500, 'GBP',
  'Merchant records a no-payout decision for the controlled conflict path.',
  null, '{}', null, '{}', 'runtime-conflict-decision', false
);
select public.record_case_source_outcome(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000004',
  'source_refund', 'refund', 500, 500, 'GBP',
  'The controlled source later reports a contradictory refund.', null,
  '{"provider":"controlled-commerce","loss_basis":"payout_value"}',
  now(), 'runtime-conflicting-source-outcome'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.case_exceptions
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and support_payout_case_id = '82000000-0000-4000-8000-000000000004'
     and exception_type = 'conflicting_financials'
     and status = 'open'
     and context ->> 'source_action' = 'refund'),
  'contradictory source outcome created merchant reconciliation work'
);

-- Known request/exposure stages are explicit entries. The USD entry proves
-- that summaries remain currency-separated.
insert into public.case_financial_entries (
  merchant_id, support_payout_case_id, state, amount_minor, currency,
  direction, idempotency_key, effective_at
) values
  ('81000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'requested', 5000, 'GBP', 'memo', 'runtime:requested:gbp', now()),
  ('81000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'exposed', 5000, 'GBP', 'memo', 'runtime:exposed:gbp', now()),
  ('81000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'exposed', 900, 'USD', 'memo', 'runtime:exposed:usd', now());
select public.recompute_case_financial_summary(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001'
);
select pg_temp.assert_true(
  (select count(*) = 2 from public.case_financial_summaries
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and support_payout_case_id = '82000000-0000-4000-8000-000000000001'),
  'mixed currencies produced exactly two summaries'
);
select pg_temp.assert_true(
  (select known_states @> array['exposed']::text[]
   from public.case_financial_summaries
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and support_payout_case_id = '82000000-0000-4000-8000-000000000001'
     and currency = 'GBP'),
  'known state coverage retained'
);
select pg_temp.assert_true(
  (select amount_minor = 5000 and total_count = 1
   from public.get_financial_report_records(
     '81000000-0000-4000-8000-000000000001', null, 'GBP',
     'exposed', null, 50, 0
   )),
  'financial drill-down resolves the canonical exposed summary'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.get_financial_report_records(
      '81000000-0000-4000-8000-000000000001', null, 'GBP',
      'paid', null, 50, 0
    )
  ),
  'financial drill-down excludes unknown paid values instead of reporting zero'
);

-- Merchant authorization is atomic with history/outbox and is not a payment.
select public.record_case_decision(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  1, 'approved', 'refund', 5000, 'GBP',
  'Merchant approved up to the recorded exposure.', null,
  '{"recommended_payout_action":"refund"}', true,
  '{"source_order_id":"83000000-0000-4000-8000-000000000001"}',
  'runtime-decision-approved', false
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.case_decisions
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and support_payout_case_id = '82000000-0000-4000-8000-000000000001'),
  'one immutable merchant decision'
);
select pg_temp.assert_true(
  (select outcome = 'pending' from public.claim_outcomes
   where claim_id = '82000000-0000-4000-8000-000000000001'),
  'compatibility outcome remains pending after authorization'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.case_outcomes
    where merchant_id = '81000000-0000-4000-8000-000000000001'
      and support_payout_case_id = '82000000-0000-4000-8000-000000000001'
  ),
  'merchant authorization did not fabricate a source outcome'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.case_financial_entries
    where merchant_id = '81000000-0000-4000-8000-000000000001'
      and support_payout_case_id = '82000000-0000-4000-8000-000000000001'
      and state in ('paid', 'confirmed_loss', 'recovered', 'prevented')
  ),
  'authorization did not imply money movement, loss, recovery, or prevention'
);

-- Exact replay returns the original result and does not append duplicates.
select public.record_case_decision(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  1, 'approved', 'refund', 5000, 'GBP',
  'Merchant approved up to the recorded exposure.', null,
  '{"recommended_payout_action":"refund"}', true,
  '{"source_order_id":"83000000-0000-4000-8000-000000000001"}',
  'runtime-decision-approved', false
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.case_decisions
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and idempotency_key = 'runtime-decision-approved'),
  'decision replay was idempotent'
);

do $conflict$
begin
  begin
    perform public.record_case_decision(
      '81000000-0000-4000-8000-000000000001',
      '82000000-0000-4000-8000-000000000001',
      1, 'approved', 'refund', 4900, 'GBP',
      'Merchant approved a different amount.', null,
      '{"recommended_payout_action":"refund"}', true, '{}',
      'runtime-decision-approved', false
    );
    raise exception 'expected decision idempotency conflict';
  exception
    when sqlstate '22023' then
      if sqlerrm not like '%idempotency_conflict%' then raise; end if;
  end;
end;
$conflict$;

-- A late failure inside the nested transition rolls back decision and
-- compatibility writes from the same PostgreSQL statement.
do $atomic_failure$
begin
  begin
    perform public.record_case_decision(
      '81000000-0000-4000-8000-000000000001',
      '82000000-0000-4000-8000-000000000003',
      1, 'approved', 'refund', 1000, 'GBP',
      'This transition must roll back.', null, '{}', null, '{}',
      'runtime-invalid-final-case', false
    );
    raise exception 'expected final-state transition rejection';
  exception
    when sqlstate '22023' then
      if sqlerrm not like '%case_transition_rejected%' then raise; end if;
  end;
end;
$atomic_failure$;
select pg_temp.assert_true(
  not exists (select 1 from public.case_decisions where idempotency_key = 'runtime-invalid-final-case'),
  'failed transition rolled back decision history'
);
select pg_temp.assert_true(
  not exists (select 1 from public.claim_outcomes where claim_id = '82000000-0000-4000-8000-000000000003'),
  'failed transition rolled back compatibility projection'
);

-- Source corrections mirror and link the immutable prior outcome. They cannot
-- silently mutate it or reverse the same fact twice under a different key.
select public.record_case_source_outcome(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000003',
  'source_refund', 'refund', 1000, 1000, 'GBP',
  'Controlled source recorded a historical refund.', null,
  '{"provider":"controlled-commerce","loss_basis":"payout_value"}',
  now() - interval '2 hours', 'runtime-source-correction-original'
);
select public.record_case_source_outcome(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000003',
  'source_refund_reversal', 'refund', 1000, 1000, 'GBP',
  'Controlled source reversed the historical refund.', null,
  jsonb_build_object(
    'provider', 'controlled-commerce',
    'loss_basis', 'payout_value',
    'reversal', true,
    'reverses_outcome_id', (
      select id::text from public.case_outcomes
      where idempotency_key = 'runtime-source-correction-original'
    )
  ),
  now() - interval '1 hour', 'runtime-source-correction-reversal'
);
select pg_temp.assert_true(
  (select reversal.reverses_outcome_id = original.id
          and reversal.amount_minor = original.amount_minor
          and reversal.currency = original.currency
   from public.case_outcomes reversal
   join public.case_outcomes original
     on original.id = reversal.reverses_outcome_id
   where reversal.idempotency_key = 'runtime-source-correction-reversal'),
  'source outcome correction retained an exact immutable reversal link'
);
select pg_temp.assert_true(
  (select payload ->> 'reverses_outcome_id' is not null
          and (payload ->> 'reversal')::boolean
   from public.domain_events
   where idempotency_key = 'case-outcome:runtime-source-correction-reversal'),
  'source outcome correction outbox retained projection linkage'
);
do $duplicate_source_reversal$
begin
  begin
    perform public.record_case_source_outcome(
      '81000000-0000-4000-8000-000000000001',
      '82000000-0000-4000-8000-000000000003',
      'source_refund_reversal', 'refund', 1000, 1000, 'GBP',
      'A second reversal must be rejected.', null,
      jsonb_build_object(
        'reversal', true,
        'reverses_outcome_id', (
          select id::text from public.case_outcomes
          where idempotency_key = 'runtime-source-correction-original'
        )
      ),
      now(), 'runtime-source-correction-reversal-duplicate'
    );
    raise exception 'expected duplicate source outcome reversal rejection';
  exception
    when sqlstate '22023' then
      if sqlerrm not like '%case_outcome_already_reversed%' then raise; end if;
  end;
end;
$duplicate_source_reversal$;

-- A verified source outcome is a distinct immutable fact/outbox event.
select public.record_case_source_outcome(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  'source_refund', 'refund', 4500, 4500, 'GBP',
  'Commerce source confirmed the refund.', null,
  '{"provider":"controlled-commerce","loss_basis":"payout_value"}',
  now(), 'runtime-source-refund'
);
select public.record_case_source_outcome(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  'source_refund', 'refund', 4500, 4500, 'GBP',
  'Commerce source confirmed the refund.', null,
  '{"provider":"controlled-commerce","loss_basis":"payout_value"}',
  now(), 'runtime-source-refund'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.case_outcomes
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and idempotency_key = 'runtime-source-refund'),
  'source outcome replay was idempotent'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.domain_events
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and event_type = 'case.outcome_reconciled'
     and idempotency_key = 'case-outcome:runtime-source-refund'),
  'source outcome and outbox event committed together'
);

-- Simulate the idempotent projection rows; focused TypeScript tests exercise
-- the handler itself. The database verifies stable keys, reversals and summary.
with source_event as (
  select id from public.domain_events
  where merchant_id = '81000000-0000-4000-8000-000000000001'
    and idempotency_key = 'case-outcome:runtime-source-refund'
), decision_event as (
  select id from public.domain_events
  where merchant_id = '81000000-0000-4000-8000-000000000001'
    and idempotency_key = 'case-decision:runtime-decision-approved'
)
insert into public.case_financial_entries (
  merchant_id, support_payout_case_id, state, amount_minor, currency,
  direction, domain_event_id, idempotency_key, effective_at
)
select '81000000-0000-4000-8000-000000000001'::uuid, '82000000-0000-4000-8000-000000000001'::uuid,
       'approved', 5000, 'GBP', 'memo', id, id::text || ':approved', now()
from decision_event
union all
select '81000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001',
       'paid', 4500, 'GBP', 'debit', id, id::text || ':paid', now()
from source_event
union all
select '81000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001',
       'confirmed_loss', 4500, 'GBP', 'debit', id, id::text || ':confirmed-loss', now()
from source_event;

insert into public.loss_cases (
  id, merchant_id, support_payout_case_id, case_category, case_type,
  recovery_route, status, refund_value_minor, currency,
  source_confidence, source_fingerprint, financial_state, confirmed_at,
  attribution, recoverability
) values (
  '84000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  'refund_dispute', 'refund', 'carrier_claim', 'detected',
  4500, 'GBP', 'source_verified', 'runtime:source-refund',
  'confirmed', now(), 'carrier_loss', 'recoverable'
);

insert into public.case_financial_entries (
  merchant_id, support_payout_case_id, loss_case_id, state,
  amount_minor, currency, direction, idempotency_key, effective_at
) values (
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  '84000000-0000-4000-8000-000000000001',
  'recoverable', 3000, 'GBP', 'memo', 'runtime:recoverable', now()
);
select public.recompute_case_financial_summary(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001'
);
select pg_temp.assert_true(
  (select paid_minor = 4500 and confirmed_loss_minor = 4500
          and approved_minor = 5000 and recoverable_minor = 3000
   from public.case_financial_summaries
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and support_payout_case_id = '82000000-0000-4000-8000-000000000001'
     and currency = 'GBP'),
  'source outcome projects independently from authorization'
);
select pg_temp.assert_true(
  (select amount_minor = 4500 and total_count = 1
   from public.get_financial_report_records(
     '81000000-0000-4000-8000-000000000001', null, 'GBP',
     'confirmed_loss', 'delivery_loss', 50, 0
   )),
  'loss-category drill-down reconciles to the confirmed-loss summary'
);
update public.support_payout_cases
set reason_normalized = 'missing_item'
where id = '82000000-0000-4000-8000-000000000001'
  and merchant_id = '81000000-0000-4000-8000-000000000001';
select pg_temp.assert_true(
  not exists (
    select 1 from public.get_financial_report_records(
      '81000000-0000-4000-8000-000000000001', null, 'GBP',
      'confirmed_loss', 'delivery_loss', 50, 0
    )
  ),
  'normalized missing item is not reported as whole-parcel delivery loss'
);
select pg_temp.assert_true(
  (select amount_minor = 4500 and total_count = 1
   from public.get_financial_report_records(
     '81000000-0000-4000-8000-000000000001', null, 'GBP',
     'confirmed_loss', 'fulfilment_or_warehouse_error', 50, 0
   )),
  'normalized missing item reaches fulfilment and warehouse reporting'
);
select pg_temp.assert_true(
  (select amount_minor = 4500 and total_count = 1
   from public.get_financial_report_records(
     '81000000-0000-4000-8000-000000000001', null, 'GBP',
     'final_net_loss', null, 50, 0
   )),
  'final net loss is derived per case from confirmed loss less recovered value'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.get_financial_report_records(
      '81000000-0000-4000-8000-000000000002', null, 'GBP',
      'confirmed_loss', null, 50, 0
    )
  ),
  'financial drill-down remains merchant scoped'
);

-- Recovery approval is not cash; payment emits delta-valued outbox facts.
insert into public.recovery_cases (
  id, merchant_id, support_payout_case_id, loss_case_id,
  recovery_type, owner_type, status,
  merchant_loss_amount, eligible_loss_amount, estimated_recoverable_max,
  amount_sought_minor, amount_approved_minor, amount_recovered_minor,
  amount_written_off_minor, currency
) values (
  '85000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  '84000000-0000-4000-8000-000000000001',
  'carrier_claim', 'carrier', 'submitted',
  45, 30, 30, 3000, 0, 0, 0, 'GBP'
);
select public.transition_recovery_case(
  '81000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000001',
  'approved', 'approved', 'Carrier approved the submitted amount.',
  3000, null, 'runtime-recovery-approved'
);
select pg_temp.assert_true(
  (select amount_approved_minor = 3000 and amount_recovered_minor = 0 and coalesce(amount_recovered, 0) = 0
   from public.recovery_cases where id = '85000000-0000-4000-8000-000000000001'),
  'approval remained distinct from received value'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.domain_events
    where merchant_id = '81000000-0000-4000-8000-000000000001'
      and idempotency_key = 'recovery-action:runtime-recovery-approved'
      and event_type = 'recovery.completed'
  ),
  'approval did not emit recovered cash event'
);

select public.transition_recovery_case(
  '81000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000001',
  'paid', 'paid', 'First partial credit received.',
  1000, null, 'runtime-recovery-paid-1'
);
select pg_temp.assert_true(
  (select status = 'partially_approved' and amount_recovered_minor = 1000
   from public.recovery_cases where id = '85000000-0000-4000-8000-000000000001'),
  'partial receipt retained an open partial state'
);
select pg_temp.assert_true(
  (select (payload ->> 'amount_minor')::bigint = 1000
   from public.domain_events
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and idempotency_key = 'recovery-action:runtime-recovery-paid-1'
     and event_type = 'recovery.completed'),
  'first received event contains its exact delta'
);

select public.transition_recovery_case(
  '81000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000001',
  'paid', 'paid', 'Final credit received.',
  3000, null, 'runtime-recovery-paid-2'
);
select public.transition_recovery_case(
  '81000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000001',
  'paid', 'paid', 'Final credit received.',
  3000, null, 'runtime-recovery-paid-2'
);
select pg_temp.assert_true(
  (select status = 'paid' and amount_recovered_minor = 3000 and amount_written_off_minor = 0
   from public.recovery_cases where id = '85000000-0000-4000-8000-000000000001'),
  'full receipt closed the recovery as paid'
);
select pg_temp.assert_true(
  (select (payload ->> 'amount_minor')::bigint = 2000
   from public.domain_events
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and idempotency_key = 'recovery-action:runtime-recovery-paid-2'
     and event_type = 'recovery.completed'),
  'second received event contains only the additional delta'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.recovery_case_events
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and idempotency_key = 'runtime-recovery-paid-2'),
  'recovery payment replay was idempotent'
);

-- A second recovery demonstrates explicit remaining-value write-off.
insert into public.recovery_cases (
  id, merchant_id, support_payout_case_id, loss_case_id,
  recovery_type, owner_type, status,
  merchant_loss_amount, eligible_loss_amount, estimated_recoverable_max,
  amount_sought_minor, amount_approved_minor, amount_recovered_minor,
  amount_written_off_minor, amount_recovered, currency
) values (
  '85000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  '84000000-0000-4000-8000-000000000001',
  'carrier_claim', 'carrier', 'rejected',
  45, 20, 20, 2000, 1000, 500, 0, 5, 'GBP'
);
select public.transition_recovery_case(
  '81000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000002',
  'closed_unrecoverable', 'closed',
  'Carrier appeal exhausted; close the remaining pursued value.',
  null, null, 'runtime-recovery-writeoff'
);
select pg_temp.assert_true(
  (select amount_recovered_minor = 500 and amount_written_off_minor = 1500
   from public.recovery_cases where id = '85000000-0000-4000-8000-000000000002'),
  'closure preserved receipt and classified only the remainder as written off'
);
select pg_temp.assert_true(
  (select (payload ->> 'amount_minor')::bigint = 1500
   from public.domain_events
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and idempotency_key = 'recovery-action:runtime-recovery-writeoff'
     and event_type = 'loss.written_off'),
  'write-off outbox event contains outstanding amount only'
);

-- Prevention remains pending until the later of 30 calendar days and an
-- explicit source window. Merchant B proves tenant-local isolation.
select public.record_case_decision(
  '81000000-0000-4000-8000-000000000002',
  '82000000-0000-4000-8000-000000000002',
  1, 'denied', 'denied', 3000, 'GBP',
  'Request does not meet the merchant policy.', null,
  '{}', null, '{"observation_ends_at":"2026-12-31T00:00:00Z"}',
  'runtime-decision-denied', false
);
select pg_temp.assert_true(
  (select status = 'pending' and eligible_at >= '2026-12-31T00:00:00Z'::timestamptz
   from public.case_prevention_observations
   where merchant_id = '81000000-0000-4000-8000-000000000002'),
  'prevention waits for the later source window'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.case_financial_entries
    where merchant_id = '81000000-0000-4000-8000-000000000002' and state = 'prevented'
  ),
  'denial itself did not fabricate prevented value'
);

do $blocked_case_closure$
begin
  begin
    perform public.transition_payout_case(
      '81000000-0000-4000-8000-000000000002',
      '82000000-0000-4000-8000-000000000002',
      2, '{"status":"closed"}', 'Attempt closure with unresolved prevention.',
      null, 'merchant_manual', 'case.updated', '{}', array[]::text[],
      'status_changed', '{}', 'runtime-case-close-blocked',
      false, false, false, false
    );
    raise exception 'expected unresolved case closure rejection';
  exception
    when sqlstate '22023' then
      if sqlerrm not like '%case_closure_blocked:%prevention_observation%' then raise; end if;
  end;
end;
$blocked_case_closure$;
select public.transition_payout_case(
  '81000000-0000-4000-8000-000000000002',
  '82000000-0000-4000-8000-000000000002',
  2, '{"status":"closed"}',
  'Merchant explicitly accepts closure while the prevention observation remains pending.',
  null, 'merchant_manual', 'case.updated',
  '{"closure_exception_acknowledged":true}', array[]::text[],
  'status_changed', '{}', 'runtime-case-close-override',
  false, false, false, true
);
select pg_temp.assert_true(
  (select status = 'closed' from public.support_payout_cases
   where id = '82000000-0000-4000-8000-000000000002')
  and
  (select count(*) = 1 from public.case_exceptions
   where dedup_key = 'case-closure-exception:82000000-0000-4000-8000-000000000002:v3'
     and status = 'resolved'
     and context -> 'closure_blockers' ? 'prevention_observation'),
  'explicit closure exception retained its reason and unresolved blocker'
);
select * from public.finalize_due_prevention_observations(500, '2027-01-02T00:00:00Z');
select pg_temp.assert_true(
  (select status = 'confirmed' and domain_event_id is not null
   from public.case_prevention_observations
   where merchant_id = '81000000-0000-4000-8000-000000000002'),
  'mature observation created a confirmation outbox fact'
);
select pg_temp.assert_true(
  (select status = 'cancelled' and cancellation_reason = 'later_payout_observed'
   from public.case_prevention_observations
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and support_payout_case_id = '82000000-0000-4000-8000-000000000004'),
  'contradictory payout cancelled prevention without crossing merchant scope'
);

-- Append-only correction linkage nets to zero while preserving both rows.
with original as (
  insert into public.case_financial_entries (
    merchant_id, support_payout_case_id, state, amount_minor, currency,
    direction, idempotency_key, effective_at
  ) values (
    '81000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    'estimated_loss', 700, 'GBP', 'memo', 'runtime:estimate:original', now()
  ) returning id
)
insert into public.case_financial_entries (
  merchant_id, support_payout_case_id, state, amount_minor, currency,
  direction, reverses_entry_id, idempotency_key, effective_at
)
select '81000000-0000-4000-8000-000000000001',
       '82000000-0000-4000-8000-000000000001',
       'estimated_loss', 700, 'GBP', 'memo', id,
       'runtime:estimate:reversal', now()
from original;
select public.recompute_case_financial_summary(
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001'
);
select pg_temp.assert_true(
  (select estimated_loss_minor = 0 and known_states @> array['estimated_loss']::text[]
   from public.case_financial_summaries
   where merchant_id = '81000000-0000-4000-8000-000000000001'
     and support_payout_case_id = '82000000-0000-4000-8000-000000000001'
     and currency = 'GBP'),
  'reversal nets to a proven zero without deleting history'
);

-- Authenticated viewers cannot invoke service-owned mutation RPCs.
set local role authenticated;
do $viewer_denial$
begin
  begin
    perform public.record_case_decision(
      '81000000-0000-4000-8000-000000000001',
      '82000000-0000-4000-8000-000000000001',
      2, 'approved', 'refund', 5000, 'GBP', 'viewer must be denied',
      null, '{}', null, '{}', 'viewer-denied-decision', false
    );
    raise exception 'viewer unexpectedly executed record_case_decision';
  exception
    when insufficient_privilege then null;
  end;
end;
$viewer_denial$;
reset role;

select pg_temp.assert_true(
  not exists (select 1 from public.case_decisions where idempotency_key = 'viewer-denied-decision'),
  'viewer denial produced no side effect'
);

rollback;

\echo 'Source-to-recovery PostgreSQL runtime verification passed.'
