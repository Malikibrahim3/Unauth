\set ON_ERROR_STOP on

begin;
set local client_min_messages = warning;

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $function$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'p05_replacement_assertion_failed: %', p_message;
  end if;
end;
$function$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '5a000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'p05-owner@example.invalid', '', now(),
  '{}'::jsonb, '{"fixture":"merchant-clarity-p05"}'::jsonb, now(), now()
);

insert into public.merchants (id, name, is_demo) values
  ('5a000000-0000-4000-8000-000000000010', 'P05 replacement proof', true),
  ('5a000000-0000-4000-8000-000000000099', 'P05 isolated merchant', true);

insert into public.merchant_users (
  id, merchant_id, user_id, invited_email, role, invite_status, accepted_at
) values (
  '5a000000-0000-4000-8000-000000000011',
  '5a000000-0000-4000-8000-000000000010',
  '5a000000-0000-4000-8000-000000000001',
  'p05-owner@example.invalid', 'owner', 'active', now()
);
set constraints trg_merchant_owner_cardinality immediate;
set constraints trg_merchant_owner_cardinality deferred;

insert into public.merchant_integrations (
  id, merchant_id, provider_id, category, status, auth_mode, display_name,
  provider_account_id, provider_account_name, environment, writeback_enabled,
  last_verified_at, last_verification_status
) values (
  '5a000000-0000-4000-8000-000000000020',
  '5a000000-0000-4000-8000-000000000010',
  'shopify', 'commerce', 'connected', 'oauth', 'P05 local Shopify fixture',
  'p05-proof.myshopify.com', 'P05 proof store', 'test', false,
  now(), 'verified'
);

insert into public.source_accounts (
  id, merchant_id, connection_id, provider_id, external_account_id,
  display_name, base_url, is_synthetic, environment, metadata
) values (
  '5a000000-0000-4000-8000-000000000021',
  '5a000000-0000-4000-8000-000000000010',
  '5a000000-0000-4000-8000-000000000020',
  'shopify', 'p05-proof.myshopify.com', 'P05 proof store',
  'https://p05-proof.myshopify.com', true, 'test',
  '{"fixture":"merchant-clarity-p05"}'::jsonb
);

insert into public.source_orders (
  id, merchant_id, source, source_account_id, external_id,
  order_number, financial_status, fulfillment_state, total_price, currency,
  line_items_count, placed_at, raw_payload_hash
) values (
  '5a000000-0000-4000-8000-000000000030',
  '5a000000-0000-4000-8000-000000000010',
  'shopify', '5a000000-0000-4000-8000-000000000021',
  '9000000001', 'P05-1001', 'paid', 'delivered', 54, 'GBP', 2,
  now() - interval '7 days', 'sha256:p05-order'
);

insert into public.source_order_lines (
  id, merchant_id, source_order_id, external_id, sku, product_ref,
  variant_ref, title, quantity, unit_price_minor, total_minor, cost_minor,
  currency, raw_metadata
) values
  (
    '5a000000-0000-4000-8000-000000000031',
    '5a000000-0000-4000-8000-000000000010',
    '5a000000-0000-4000-8000-000000000030',
    'line-1001', 'COAT-BLK-M', 'product-coat', 'variant-coat-black-medium',
    'Black coat, medium', 3, 1800, 5400, 1200, 'GBP',
    '{"fixture":"merchant-clarity-p05"}'::jsonb
  ),
  (
    '5a000000-0000-4000-8000-000000000032',
    '5a000000-0000-4000-8000-000000000010',
    '5a000000-0000-4000-8000-000000000030',
    'line-1002', 'HAT-NAVY', 'product-hat', 'variant-hat-navy',
    'Navy hat', 2, 900, 1800, 500, 'GBP',
    '{"fixture":"merchant-clarity-p05"}'::jsonb
  );

insert into public.support_payout_cases (
  id, merchant_id, source_order_id, claim_type, status, detection_method,
  manual_reference, amount_at_risk, currency, primary_currency,
  requested_action, state_version
) values
  ('5a000000-0000-4000-8000-000000000041', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000030', 'damaged', 'pending', 'manual', 'P05-A', 54, 'GBP', 'GBP', 'replacement', 1),
  ('5a000000-0000-4000-8000-000000000042', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000030', 'damaged', 'pending', 'manual', 'P05-B', 18, 'GBP', 'GBP', 'replacement', 1),
  ('5a000000-0000-4000-8000-000000000043', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000030', 'damaged', 'pending', 'manual', 'P05-C', 9, 'GBP', 'GBP', 'replacement', 1),
  ('5a000000-0000-4000-8000-000000000044', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000030', 'damaged', 'pending', 'manual', 'P05-D', 9, 'GBP', 'GBP', 'replacement', 1),
  ('5a000000-0000-4000-8000-000000000045', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000030', 'refund_request', 'pending', 'manual', 'P05-LEGACY', 10, 'GBP', 'GBP', 'refund', 1),
  ('5a000000-0000-4000-8000-000000000046', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000030', 'damaged', 'pending', 'manual', 'P05-F', 36, 'GBP', 'GBP', 'replacement', 1),
  ('5a000000-0000-4000-8000-000000000047', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000030', 'damaged', 'pending', 'manual', 'P05-G', 18, 'GBP', 'GBP', 'replacement', 1);

insert into public.case_claimed_items (
  id, merchant_id, support_payout_case_id, source_order_line_id,
  claimed_sku, claimed_variant_ref, claimed_title, claimed_quantity,
  extraction_method, match_status, match_method, match_confidence,
  confirmed_by, confirmed_at, metadata
) values
  ('5a000000-0000-4000-8000-000000000051', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000041', '5a000000-0000-4000-8000-000000000031', 'COAT-BLK-M', 'variant-coat-black-medium', 'Black coat, medium', 3, 'agent_selected', 'confirmed', 'exact_source_line', 1, '5a000000-0000-4000-8000-000000000001', now(), '{}'),
  ('5a000000-0000-4000-8000-000000000052', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000041', '5a000000-0000-4000-8000-000000000032', 'HAT-NAVY', 'variant-hat-navy', 'Navy hat', 2, 'agent_selected', 'confirmed', 'exact_source_line', 1, '5a000000-0000-4000-8000-000000000001', now(), '{}'),
  ('5a000000-0000-4000-8000-000000000053', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000042', '5a000000-0000-4000-8000-000000000031', 'COAT-BLK-M', 'variant-coat-black-medium', 'Black coat, medium', 3, 'agent_selected', 'confirmed', 'exact_source_line', 1, '5a000000-0000-4000-8000-000000000001', now(), '{}'),
  ('5a000000-0000-4000-8000-000000000054', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000043', '5a000000-0000-4000-8000-000000000032', 'WRONG-SKU', 'variant-hat-navy', 'Navy hat', 2, 'agent_selected', 'confirmed', 'exact_source_line', 1, '5a000000-0000-4000-8000-000000000001', now(), '{}'),
  ('5a000000-0000-4000-8000-000000000055', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000044', '5a000000-0000-4000-8000-000000000032', 'HAT-NAVY', 'variant-hat-navy', 'Navy hat', 2, 'agent_selected', 'confirmed', 'exact_source_line', 1, '5a000000-0000-4000-8000-000000000001', now(), '{}'),
  ('5a000000-0000-4000-8000-000000000056', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000046', '5a000000-0000-4000-8000-000000000031', 'COAT-BLK-M', 'variant-coat-black-medium', 'Black coat, medium', 3, 'agent_selected', 'confirmed', 'exact_source_line', 1, '5a000000-0000-4000-8000-000000000001', now(), '{}'),
  ('5a000000-0000-4000-8000-000000000057', '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000047', '5a000000-0000-4000-8000-000000000031', 'COAT-BLK-M', 'variant-coat-black-medium', 'Black coat, medium', 3, 'agent_selected', 'confirmed', 'exact_source_line', 1, '5a000000-0000-4000-8000-000000000001', now(), '{}');

create temp table p05_results (key text primary key, value jsonb);

insert into p05_results values ('authorise-a', public.record_same_item_replacement_v1(
  '5a000000-0000-4000-8000-000000000010',
  '5a000000-0000-4000-8000-000000000041', 1,
  '5a000000-0000-4000-8000-000000000001', 'p05-authorise-a', 4000, 'GBP',
  'Replace the exact damaged coat and hat lines.', null,
  '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000051","quantity":2},{"claimed_item_id":"5a000000-0000-4000-8000-000000000052","quantity":1}]',
  '{"comparison_version":"resolution-comparison-v1","comparison_token":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}',
  true, '{}'
));

select pg_temp.assert_true(
  (select decision = 'approved' and action = 'same_item_replacement'
   from public.case_decisions where idempotency_key = 'p05-authorise-a'),
  'the stored decision retained explicit replacement action and legacy approved compatibility'
);
select pg_temp.assert_true(
  (select count(*) = 2 and sum(quantity) = 3
   from public.case_replacement_authorisation_items
   where merchant_id = '5a000000-0000-4000-8000-000000000010'
     and support_payout_case_id = '5a000000-0000-4000-8000-000000000041'),
  'partial multi-item quantities persisted against exact confirmed lines'
);
select pg_temp.assert_true(
  (select capability_id = 'replacement.manual_handoff'
          and action_state = 'handoff_ready'
          and payload ->> 'operation' = 'replacement'
          and (payload ->> 'external_action_performed')::boolean is false
          and payload #>> '{source_object,reference}' = 'P05-1001'
          and jsonb_array_length(payload -> 'items') = 2
   from public.connector_action_runs
   where id = ((select value from p05_results where key = 'authorise-a') #>> '{action,id}')::uuid),
  'the reloadable handoff retained order, exact items and no-execution truth'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.connector_action_runs
   where merchant_id = '5a000000-0000-4000-8000-000000000010'
     and support_payout_case_id = '5a000000-0000-4000-8000-000000000041'
     and capability_id = 'replacement.manual_handoff')
  and not exists (
    select 1 from public.connector_action_runs
    where merchant_id = '5a000000-0000-4000-8000-000000000010'
      and support_payout_case_id = '5a000000-0000-4000-8000-000000000041'
      and capability_id like 'refund.%'
  ),
  'replacement never entered refund handoff storage'
);
select pg_temp.assert_true(
  (select outcome = 'pending' and amount_refunded is null
   from public.claim_outcomes where claim_id = '5a000000-0000-4000-8000-000000000041')
  and not exists (
    select 1 from public.case_financial_entries
    where merchant_id = '5a000000-0000-4000-8000-000000000010'
      and support_payout_case_id = '5a000000-0000-4000-8000-000000000041'
      and state in ('paid', 'confirmed_loss', 'recovered')
  ),
  'authorisation did not fabricate dispatch, refund, cost, recovery or money movement'
);

insert into p05_results values ('replay-a', public.record_same_item_replacement_v1(
  '5a000000-0000-4000-8000-000000000010',
  '5a000000-0000-4000-8000-000000000041', 1,
  '5a000000-0000-4000-8000-000000000001', 'p05-authorise-a', 4000, 'GBP',
  'Replace the exact damaged coat and hat lines.', null,
  '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000051","quantity":2},{"claimed_item_id":"5a000000-0000-4000-8000-000000000052","quantity":1}]',
  '{"comparison_version":"resolution-comparison-v1","comparison_token":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}',
  true, '{}'
));
select pg_temp.assert_true(
  (select (value ->> 'replayed')::boolean from p05_results where key = 'replay-a')
  and (select count(*) = 1 from public.case_decisions where idempotency_key = 'p05-authorise-a')
  and (select count(*) = 1 from public.connector_action_runs
       where idempotency_key like 'replacement-handoff:%'),
  'exact retry returned the original action without another decision or handoff'
);

do $expected_failures$
declare
  v_failed boolean;
begin
  v_failed := false;
  begin
    perform public.record_same_item_replacement_v1(
      '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000041', 1,
      '5a000000-0000-4000-8000-000000000001', 'p05-authorise-a', 4000, 'GBP',
      'Replace the exact damaged coat and hat lines.', null,
      '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000051","quantity":1}]',
      '{"comparison_version":"resolution-comparison-v1","comparison_token":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}', true, '{}'
    );
  exception when unique_violation then
    v_failed := sqlerrm like '%replacement_idempotency_conflict%';
  end;
  if not v_failed then raise exception 'changed idempotent retry was accepted'; end if;

  v_failed := false;
  begin
    perform public.record_same_item_replacement_v1(
      '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000042', 99,
      '5a000000-0000-4000-8000-000000000001', 'p05-stale-version', 1800, 'GBP',
      'Stale comparison must not persist.', null,
      '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000053","quantity":1}]',
      '{"comparison_version":"resolution-comparison-v1","comparison_token":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}', true, '{}'
    );
  exception when serialization_failure then
    v_failed := sqlerrm like '%case_version_conflict%';
  end;
  if not v_failed then raise exception 'stale replacement version was accepted'; end if;

  v_failed := false;
  begin
    perform public.record_same_item_replacement_v1(
      '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000042', 1,
      '5a000000-0000-4000-8000-000000000001', 'p05-over-quantity', 3600, 'GBP',
      'Do not exceed remaining quantity.', null,
      '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000053","quantity":2}]',
      '{"comparison_version":"resolution-comparison-v1","comparison_token":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}', true, '{}'
    );
  exception when invalid_parameter_value then
    v_failed := sqlerrm like '%replacement_quantity_exceeds_available%';
  end;
  if not v_failed then raise exception 'over-quantity replacement was accepted'; end if;

  v_failed := false;
  begin
    perform public.record_same_item_replacement_v1(
      '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000043', 1,
      '5a000000-0000-4000-8000-000000000001', 'p05-wrong-item', 900, 'GBP',
      'A changed SKU must fail.', null,
      '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000054","quantity":1}]',
      '{"comparison_version":"resolution-comparison-v1","comparison_token":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}', true, '{}'
    );
  exception when invalid_parameter_value then
    v_failed := sqlerrm like '%replacement_same_item_identity_invalid%';
  end;
  if not v_failed then raise exception 'mismatched SKU replacement was accepted'; end if;

  v_failed := false;
  begin
    perform public.record_same_item_replacement_v1(
      '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000047', 1,
      '5a000000-0000-4000-8000-000000000001', 'p05-invalid-budget', -1, 'GBP',
      'Negative budget must fail.', null,
      '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000057","quantity":1}]',
      '{"comparison_version":"resolution-comparison-v1","comparison_token":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"}', true, '{}'
    );
  exception when invalid_parameter_value then
    v_failed := sqlerrm like '%replacement_budget_required%';
  end;
  if not v_failed then raise exception 'negative replacement budget was accepted'; end if;
end;
$expected_failures$;

insert into p05_results values ('authorise-b', public.record_same_item_replacement_v1(
  '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000042', 1,
  '5a000000-0000-4000-8000-000000000001', 'p05-authorise-b', 1800, 'GBP',
  'Replace the final available coat quantity.', null,
  '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000053","quantity":1}]',
  '{"comparison_version":"resolution-comparison-v1","comparison_token":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}',
  true, '{}'
));

-- Reversing an undispatched authorisation releases its quantities without
-- mutating the original decision or claiming an external cancellation.
insert into p05_results values ('reverse-a', public.record_case_decision(
  '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000041', 2,
  'no_action', 'no_action', 0, 'GBP',
  'Cancel the undispatched internal replacement authorisation.',
  '5a000000-0000-4000-8000-000000000001', '{}', false, '{}',
  'p05-reverse-a', true
));
select pg_temp.assert_true(
  (select count(*) = 1 from public.case_decisions reversal
   join public.case_decisions original on original.id = reversal.reverses_decision_id
   where reversal.idempotency_key = 'p05-reverse-a'
     and original.idempotency_key = 'p05-authorise-a')
  and (select action_state = 'handoff_ready' and merchant_reported_at is null
       from public.connector_action_runs
       where id = ((select value from p05_results where key = 'authorise-a') #>> '{action,id}')::uuid),
  'cancellation appended a reversal and did not pretend to cancel a shipment'
);

insert into p05_results values ('authorise-f', public.record_same_item_replacement_v1(
  '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000046', 1,
  '5a000000-0000-4000-8000-000000000001', 'p05-authorise-f', 3600, 'GBP',
  'Reuse only the two quantities released before dispatch.', null,
  '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000056","quantity":2}]',
  '{"comparison_version":"resolution-comparison-v1","comparison_token":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"}',
  true, '{}'
));

do $receipt_required$
declare v_failed boolean := false;
begin
  begin
    perform public.report_replacement_dispatch_v1(
      '5a000000-0000-4000-8000-000000000010',
      ((select value from p05_results where key = 'authorise-b') #>> '{action,id}')::uuid,
      '5a000000-0000-4000-8000-000000000001', 1,
      'p05-dispatch-missing-receipt', 'manual_shopify_handoff', null, null
    );
  exception when invalid_parameter_value then
    v_failed := sqlerrm like '%replacement_dispatch_receipt_required%';
  end;
  if not v_failed then raise exception 'dispatch without reference or receipt was accepted'; end if;
end;
$receipt_required$;

insert into p05_results values ('dispatch-b', public.report_replacement_dispatch_v1(
  '5a000000-0000-4000-8000-000000000010',
  ((select value from p05_results where key = 'authorise-b') #>> '{action,id}')::uuid,
  '5a000000-0000-4000-8000-000000000001', 1,
  'p05-dispatch-b', 'manual_shopify_handoff', 'shopify-replacement-1001',
  '{"note":"Retained local synthetic receipt"}'
));
insert into p05_results values ('dispatch-b-replay', public.report_replacement_dispatch_v1(
  '5a000000-0000-4000-8000-000000000010',
  ((select value from p05_results where key = 'authorise-b') #>> '{action,id}')::uuid,
  '5a000000-0000-4000-8000-000000000001', 1,
  'p05-dispatch-b', 'manual_shopify_handoff', 'shopify-replacement-1001',
  '{"note":"Retained local synthetic receipt"}'
));
select pg_temp.assert_true(
  (select (value ->> 'replayed')::boolean from p05_results where key = 'dispatch-b-replay')
  and (select action_state = 'merchant_reported_attempt'
              and merchant_reported_at is not null
              and external_reference = 'shopify-replacement-1001'
       from public.connector_action_runs
       where id = ((select value from p05_results where key = 'authorise-b') #>> '{action,id}')::uuid),
  'receipt-backed merchant dispatch persisted and replayed exactly once'
);

insert into p05_results values ('cost-b', public.record_replacement_cost_v1(
  '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000042',
  ((select value from p05_results where key = 'authorise-b') #>> '{action,id}')::uuid,
  '5a000000-0000-4000-8000-000000000001', 'p05-cost-b', 1250, 'GBP',
  'Actual item and shipping cost from retained receipt.', '2026-09-06T12:00:00Z'
));
insert into p05_results values ('cost-b-replay', public.record_replacement_cost_v1(
  '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000042',
  ((select value from p05_results where key = 'authorise-b') #>> '{action,id}')::uuid,
  '5a000000-0000-4000-8000-000000000001', 'p05-cost-b', 1250, 'GBP',
  'Actual item and shipping cost from retained receipt.', '2026-09-06T12:00:00Z'
));
select pg_temp.assert_true(
  (select (value ->> 'replayed')::boolean from p05_results where key = 'cost-b-replay')
  and (select count(*) = 1 from public.case_outcome_events where idempotency_key = 'p05-cost-b')
  and (select count(*) = 1 and sum(amount_minor) = 1250
       from public.case_financial_entries
       where merchant_id = '5a000000-0000-4000-8000-000000000010'
         and support_payout_case_id = '5a000000-0000-4000-8000-000000000042'
         and state = 'confirmed_loss'
         and valuation_basis = 'replacement_actual_cost')
  and not exists (
    select 1 from public.case_financial_entries
    where merchant_id = '5a000000-0000-4000-8000-000000000010'
      and support_payout_case_id = '5a000000-0000-4000-8000-000000000042'
      and state in ('paid', 'recovered')
  ),
  'actual cost is receipt-backed, idempotent and separate from paid or recovered money'
);

-- A post-dispatch reversal does not release the quantity or change the external
-- action. The later source observation must still match this dispatched action,
-- not the earlier pre-dispatch cancellation.
insert into p05_results values ('reverse-b', public.record_case_decision(
  '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000042', 2,
  'no_action', 'no_action', 0, 'GBP',
  'Reverse the internal decision after merchant-confirmed dispatch.',
  '5a000000-0000-4000-8000-000000000001', '{}', false, '{}',
  'p05-reverse-b', true
));

do $dispatched_quantity_stays_reserved$
declare v_failed boolean := false;
begin
  begin
    perform public.record_same_item_replacement_v1(
      '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000047', 1,
      '5a000000-0000-4000-8000-000000000001', 'p05-post-dispatch-overage', 1800, 'GBP',
      'A dispatched quantity remains unavailable after internal reversal.', null,
      '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000057","quantity":1}]',
      '{"comparison_version":"resolution-comparison-v1","comparison_token":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"}', true, '{}'
    );
  exception when invalid_parameter_value then
    v_failed := sqlerrm like '%replacement_quantity_exceeds_available%';
  end;
  if not v_failed then raise exception 'post-dispatch reversal released external quantity'; end if;
end;
$dispatched_quantity_stays_reserved$;

insert into public.source_replacements (
  id, merchant_id, source_account_id, source_order_id, support_payout_case_id,
  external_id, status, source_status, original_line_ref,
  replacement_line_ref, item_value_minor, shipping_cost_minor, currency,
  issued_at, raw_metadata
) values (
  '5a000000-0000-4000-8000-000000000070',
  '5a000000-0000-4000-8000-000000000010',
  '5a000000-0000-4000-8000-000000000021',
  '5a000000-0000-4000-8000-000000000030',
  '5a000000-0000-4000-8000-000000000042',
  'shopify-replacement-1001', 'completed', 'fulfilled', 'line-1001',
  'replacement-line-1001', 1200, 50, 'GBP', now(),
  '{"quantity":1,"fixture":"merchant-clarity-p05"}'
);
select
  action_row.id as observed_action_id,
  action_row.action_state,
  action_row.observed_at is not null as source_observed,
  action_row.reconciled_at is null as unreconciled,
  (select count(*) from public.case_replacement_corroborations
   where source_replacement_id = '5a000000-0000-4000-8000-000000000070') as corroboration_count,
  (select count(*) from public.case_outcome_events
   where idempotency_key = 'p05-cost-b') as cost_outcome_count,
  (select count(*) from public.case_financial_entries
   where merchant_id = '5a000000-0000-4000-8000-000000000010'
     and support_payout_case_id = '5a000000-0000-4000-8000-000000000042'
     and valuation_basis = 'replacement_actual_cost') as cost_entry_count
from public.connector_action_runs action_row
where action_row.id = ((select value from p05_results where key = 'authorise-b') #>> '{action,id}')::uuid;
select pg_temp.assert_true(
  (select count(*) = 1 from public.case_replacement_corroborations
   where merchant_id = '5a000000-0000-4000-8000-000000000010'
     and source_replacement_id = '5a000000-0000-4000-8000-000000000070'
     and external_action_id = ((select value from p05_results where key = 'authorise-b') #>> '{action,id}')::uuid)
  and (select action_state = 'succeeded' and observed_at is not null and reconciled_at is null
       from public.connector_action_runs
       where id = ((select value from p05_results where key = 'authorise-b') #>> '{action,id}')::uuid)
  and (select count(*) = 1 from public.case_outcome_events where idempotency_key = 'p05-cost-b')
  and (select count(*) = 1 from public.case_financial_entries
       where merchant_id = '5a000000-0000-4000-8000-000000000010'
         and support_payout_case_id = '5a000000-0000-4000-8000-000000000042'
         and valuation_basis = 'replacement_actual_cost'),
  'source corroboration matched the dispatched action without duplicating cost or reconciliation'
);
update public.source_replacements
set source_status = 'fulfilled'
where id = '5a000000-0000-4000-8000-000000000070';
select pg_temp.assert_true(
  (select count(*) = 1 from public.case_replacement_corroborations
   where source_replacement_id = '5a000000-0000-4000-8000-000000000070'),
  'replayed source observation did not double count'
);

insert into public.source_refunds (
  id, merchant_id, source_order_id, external_id, amount, currency,
  reason, is_full_refund, refunded_at, raw_payload_hash
) values (
  '5a000000-0000-4000-8000-000000000071',
  '5a000000-0000-4000-8000-000000000010',
  '5a000000-0000-4000-8000-000000000030',
  'p05-prior-refund', 9, 'GBP', 'Prior concession fixture', false, now(),
  'sha256:p05-prior-refund'
);
do $prior_refund_requires_justification$
declare v_failed boolean := false;
begin
  begin
    perform public.record_same_item_replacement_v1(
      '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000044', 1,
      '5a000000-0000-4000-8000-000000000001', 'p05-prior-refund-blocked', 900, 'GBP',
      'Replacement after an earlier refund needs explicit justification.', null,
      '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000055","quantity":1}]',
      '{"comparison_version":"resolution-comparison-v1","comparison_token":"9999999999999999999999999999999999999999999999999999999999999999"}', true, '{}'
    );
  exception when invalid_parameter_value then
    v_failed := sqlerrm like '%replacement_duplicate_concession_justification_required%';
  end;
  if not v_failed then raise exception 'prior refund replacement lacked duplicate-concession gate'; end if;
end;
$prior_refund_requires_justification$;
insert into p05_results values ('authorise-d', public.record_same_item_replacement_v1(
  '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000044', 1,
  '5a000000-0000-4000-8000-000000000001', 'p05-prior-refund-justified', 900, 'GBP',
  'Replacement after an earlier refund needs explicit justification.',
  'The refund covered shipping only; this exact item remains damaged and unresolved.',
  '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000055","quantity":1}]',
  '{"comparison_version":"resolution-comparison-v1","comparison_token":"9999999999999999999999999999999999999999999999999999999999999999"}',
  false, '{}'
));

-- Historical generic approval remains itself; no replacement intent, item or
-- handoff is inferred from the legacy label.
insert into p05_results values ('legacy-approved', public.record_case_decision(
  '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000045', 1,
  'approved', 'approved', 1000, 'GBP', 'Historical generic approval fixture.',
  '5a000000-0000-4000-8000-000000000001', '{}', true, '{}',
  'p05-legacy-approved', false
));
select pg_temp.assert_true(
  (select action = 'approved' from public.case_decisions where idempotency_key = 'p05-legacy-approved')
  and not exists (
    select 1 from public.case_replacement_authorisation_items item
    join public.case_decisions decision_row on decision_row.id = item.case_decision_id
    where decision_row.idempotency_key = 'p05-legacy-approved'
  )
  and not exists (
    select 1 from public.connector_action_runs
    where support_payout_case_id = '5a000000-0000-4000-8000-000000000045'
  ),
  'historical generic approval was not reinterpreted as replacement'
);

-- The authenticated role can read only through tenant membership and cannot
-- invoke the service-only replacement storage boundary.
set local role authenticated;
select set_config('request.jwt.claim.sub', '5a000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select pg_temp.assert_true(
  (select count(*) > 0 from public.case_replacement_authorisation_items),
  'tenant member could not read own replacement authorisations'
);
select set_config('request.jwt.claim.sub', '5a000000-0000-4000-8000-000000000098', true);
select pg_temp.assert_true(
  (select count(*) = 0 from public.case_replacement_authorisation_items),
  'non-member could read another tenant replacement authorisations'
);
do $permission_denied$
declare v_failed boolean := false;
begin
  begin
    perform public.record_same_item_replacement_v1(
      '5a000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000047', 1,
      null, 'p05-role-denied', 100, 'GBP', 'Role must not bypass the API.', null,
      '[{"claimed_item_id":"5a000000-0000-4000-8000-000000000057","quantity":1}]',
      '{}', false, '{}'
    );
  exception when insufficient_privilege then
    v_failed := true;
  end;
  if not v_failed then raise exception 'authenticated role executed service-only replacement RPC'; end if;
end;
$permission_denied$;
reset role;

select 'MERCHANT_CLARITY_P05_REPLACEMENT_PASS' as result;
rollback;

-- Commit a second purpose-created tenant briefly so two independent database
-- sessions can race on one original line. The final block removes every row
-- bearing this tenant ID with triggers disabled only for that exact cleanup,
-- verifies zero residue, and restores the pre-existing dblink extension state.
select case when exists (
  select 1 from pg_extension where extname = 'dblink'
) then 'true' else 'false' end as p05_dblink_was_present \gset
create extension if not exists dblink with schema extensions;

begin;
set local client_min_messages = warning;
insert into public.merchants (id, name, is_demo) values (
  '5b000000-0000-4000-8000-000000000010', 'P05 concurrency proof', true
);
insert into public.merchant_integrations (
  id, merchant_id, provider_id, category, status, auth_mode, display_name,
  provider_account_id, provider_account_name, environment, writeback_enabled,
  last_verified_at, last_verification_status
) values (
  '5b000000-0000-4000-8000-000000000020',
  '5b000000-0000-4000-8000-000000000010',
  'shopify', 'commerce', 'connected', 'oauth', 'P05 concurrency Shopify fixture',
  'p05-concurrency.myshopify.com', 'P05 concurrency store', 'test', false,
  now(), 'verified'
);
insert into public.source_accounts (
  id, merchant_id, connection_id, provider_id, external_account_id,
  display_name, base_url, is_synthetic, environment, metadata
) values (
  '5b000000-0000-4000-8000-000000000021',
  '5b000000-0000-4000-8000-000000000010',
  '5b000000-0000-4000-8000-000000000020',
  'shopify', 'p05-concurrency.myshopify.com', 'P05 concurrency store',
  'https://p05-concurrency.myshopify.com', true, 'test',
  '{"fixture":"merchant-clarity-p05-concurrency"}'
);
insert into public.source_orders (
  id, merchant_id, source, source_account_id, external_id, order_number,
  financial_status, fulfillment_state, total_price, currency,
  line_items_count, placed_at, raw_payload_hash
) values (
  '5b000000-0000-4000-8000-000000000030',
  '5b000000-0000-4000-8000-000000000010', 'shopify',
  '5b000000-0000-4000-8000-000000000021', '9000000002', 'P05-RACE-1002',
  'paid', 'delivered', 54, 'GBP', 1, now() - interval '7 days',
  'sha256:p05-concurrency-order'
);
insert into public.source_order_lines (
  id, merchant_id, source_order_id, external_id, sku, product_ref,
  variant_ref, title, quantity, unit_price_minor, total_minor, cost_minor,
  currency, raw_metadata
) values (
  '5b000000-0000-4000-8000-000000000031',
  '5b000000-0000-4000-8000-000000000010',
  '5b000000-0000-4000-8000-000000000030',
  'race-line-1001', 'COAT-RACE', 'product-race', 'variant-race',
  'Concurrency coat', 3, 1800, 5400, 1200, 'GBP',
  '{"fixture":"merchant-clarity-p05-concurrency"}'
);
insert into public.support_payout_cases (
  id, merchant_id, source_order_id, claim_type, status, detection_method,
  manual_reference, amount_at_risk, currency, primary_currency,
  requested_action, state_version
) values
  ('5b000000-0000-4000-8000-000000000041', '5b000000-0000-4000-8000-000000000010', '5b000000-0000-4000-8000-000000000030', 'damaged', 'pending', 'manual', 'P05-RACE-A', 36, 'GBP', 'GBP', 'replacement', 1),
  ('5b000000-0000-4000-8000-000000000042', '5b000000-0000-4000-8000-000000000010', '5b000000-0000-4000-8000-000000000030', 'damaged', 'pending', 'manual', 'P05-RACE-B', 36, 'GBP', 'GBP', 'replacement', 1);
insert into public.case_claimed_items (
  id, merchant_id, support_payout_case_id, source_order_line_id,
  claimed_sku, claimed_variant_ref, claimed_title, claimed_quantity,
  extraction_method, match_status, match_method, match_confidence, metadata
) values
  ('5b000000-0000-4000-8000-000000000051', '5b000000-0000-4000-8000-000000000010', '5b000000-0000-4000-8000-000000000041', '5b000000-0000-4000-8000-000000000031', 'COAT-RACE', 'variant-race', 'Concurrency coat', 3, 'agent_selected', 'confirmed', 'exact_source_line', 1, '{}'),
  ('5b000000-0000-4000-8000-000000000052', '5b000000-0000-4000-8000-000000000010', '5b000000-0000-4000-8000-000000000042', '5b000000-0000-4000-8000-000000000031', 'COAT-RACE', 'variant-race', 'Concurrency coat', 3, 'agent_selected', 'confirmed', 'exact_source_line', 1, '{}');
commit;

create temp table p05_concurrent_results (session_name text, result jsonb);
select extensions.dblink_connect(
  'p05-race-a', 'host=127.0.0.1 port=5432 dbname=postgres user=postgres password=postgres'
);
select extensions.dblink_connect(
  'p05-race-b', 'host=127.0.0.1 port=5432 dbname=postgres user=postgres password=postgres'
);
select extensions.dblink_send_query('p05-race-a', $query$
  select public.record_same_item_replacement_v1(
    '5b000000-0000-4000-8000-000000000010', '5b000000-0000-4000-8000-000000000041', 1,
    null, 'p05-race-a', 3600, 'GBP', 'Concurrent authorisation A.', null,
    '[{"claimed_item_id":"5b000000-0000-4000-8000-000000000051","quantity":2}]',
    '{"comparison_version":"resolution-comparison-v1","comparison_token":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab"}',
    false, '{}'
  )
$query$);
select extensions.dblink_send_query('p05-race-b', $query$
  select public.record_same_item_replacement_v1(
    '5b000000-0000-4000-8000-000000000010', '5b000000-0000-4000-8000-000000000042', 1,
    null, 'p05-race-b', 3600, 'GBP', 'Concurrent authorisation B.', null,
    '[{"claimed_item_id":"5b000000-0000-4000-8000-000000000052","quantity":2}]',
    '{"comparison_version":"resolution-comparison-v1","comparison_token":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbc"}',
    false, '{}'
  )
$query$);

insert into p05_concurrent_results
select 'a', result
from extensions.dblink_get_result('p05-race-a', false) as response(result jsonb);
select extensions.dblink_error_message('p05-race-a') as p05_race_a_message \gset
insert into p05_concurrent_results
select 'b', result
from extensions.dblink_get_result('p05-race-b', false) as response(result jsonb);
select extensions.dblink_error_message('p05-race-b') as p05_race_b_message \gset

do $concurrency_assertion$
begin
  if (select count(*) from p05_concurrent_results) <> 1
     or (select count(*) from public.case_decisions
         where merchant_id = '5b000000-0000-4000-8000-000000000010'
           and idempotency_key in ('p05-race-a', 'p05-race-b')) <> 1
     or (select coalesce(sum(quantity), 0) from public.case_replacement_authorisation_items
         where merchant_id = '5b000000-0000-4000-8000-000000000010') <> 2 then
    raise exception 'concurrent replacement requests over-authorised or failed non-atomically';
  end if;
end;
$concurrency_assertion$;

select extensions.dblink_disconnect('p05-race-a');
select extensions.dblink_disconnect('p05-race-b');

-- Exact local cleanup for the committed concurrency fixture. Replica mode is
-- scoped to this superuser session and purpose-created merchant only, so the
-- immutable proof rows can be removed without touching any pre-existing data.
set session_replication_role = replica;
delete from public.claim_outcomes
where claim_id in (
  '5b000000-0000-4000-8000-000000000041',
  '5b000000-0000-4000-8000-000000000042'
);
do $cleanup$
declare row_value record;
begin
  for row_value in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'merchant_id'
      and table_name in (
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
      )
    group by table_schema, table_name
  loop
    execute format(
      'delete from %I.%I where merchant_id = $1',
      row_value.table_schema, row_value.table_name
    ) using '5b000000-0000-4000-8000-000000000010'::uuid;
  end loop;
  delete from public.merchants
  where id = '5b000000-0000-4000-8000-000000000010';
end;
$cleanup$;
set session_replication_role = origin;

do $cleanup_assertion$
declare row_value record; v_count bigint;
begin
  if exists (
    select 1 from public.merchants
    where id = '5b000000-0000-4000-8000-000000000010'
  ) or exists (
    select 1 from public.claim_outcomes
    where claim_id in (
      '5b000000-0000-4000-8000-000000000041',
      '5b000000-0000-4000-8000-000000000042'
    )
  ) then
    raise exception 'P05 concurrency fixture cleanup left root rows';
  end if;
  for row_value in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'merchant_id'
      and table_name in (
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
      )
    group by table_schema, table_name
  loop
    execute format(
      'select count(*) from %I.%I where merchant_id = $1',
      row_value.table_schema, row_value.table_name
    ) into v_count using '5b000000-0000-4000-8000-000000000010'::uuid;
    if v_count <> 0 then
      raise exception 'P05 concurrency fixture cleanup left rows in %.%',
        row_value.table_schema, row_value.table_name;
    end if;
  end loop;
end;
$cleanup_assertion$;

\if :p05_dblink_was_present
\else
drop extension dblink;
\endif

select 'MERCHANT_CLARITY_P05_CONCURRENCY_AND_CLEANUP_PASS' as result;
