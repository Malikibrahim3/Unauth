\set ON_ERROR_STOP on

begin;
set local client_min_messages = warning;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '59000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'loss-desk-owner@example.invalid', '', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.merchants (id, name, is_demo) values (
  '59000000-0000-4000-8000-000000000010', 'Loss desk durable capability proof', true
);

insert into public.merchant_users (
  id, merchant_id, user_id, invited_email, role, invite_status, accepted_at
) values (
  '59000000-0000-4000-8000-000000000011',
  '59000000-0000-4000-8000-000000000010',
  '59000000-0000-4000-8000-000000000001',
  'loss-desk-owner@example.invalid', 'owner', 'active', now()
);

set constraints trg_merchant_owner_cardinality immediate;
set constraints trg_merchant_owner_cardinality deferred;

insert into public.support_payout_cases (
  id, merchant_id, claim_type, status, submitted_at, manual_reference,
  amount_at_risk, currency, state_version
) values
  ('59000000-0000-4000-8000-000000000021', '59000000-0000-4000-8000-000000000010', 'item_not_received', 'pending', '2026-08-12T10:00:00Z', 'LD-BULK-1', 120, 'GBP', 1),
  ('59000000-0000-4000-8000-000000000022', '59000000-0000-4000-8000-000000000010', 'item_not_received', 'pending', '2026-08-13T10:00:00Z', 'LD-BULK-2', 80, 'GBP', 1);

do $proof$
declare
  v_result jsonb;
  v_replay jsonb;
  v_failed boolean := false;
begin
  v_result := public.bulk_transition_payout_cases(
    '59000000-0000-4000-8000-000000000010',
    '59000000-0000-4000-8000-000000000001',
    'assign',
    '[{"caseId":"59000000-0000-4000-8000-000000000021","expectedStateVersion":1,"assignment":"assign_to_me"},{"caseId":"59000000-0000-4000-8000-000000000022","expectedStateVersion":1,"assignment":"assign_to_me"}]'::jsonb,
    'loss-desk-bulk-assign-1'
  );
  if (v_result ->> 'writes_performed')::integer <> 2
     or jsonb_array_length(v_result -> 'audit_receipts') <> 2
     or v_result -> 'batch_receipt' ->> 'id' is null
     or (select count(*) from public.support_payout_cases
         where merchant_id = '59000000-0000-4000-8000-000000000010'
           and assigned_to = '59000000-0000-4000-8000-000000000001'
           and state_version = 2) <> 2 then
    raise exception 'atomic bulk assignment did not persist its complete receipt set';
  end if;

  v_replay := public.bulk_transition_payout_cases(
    '59000000-0000-4000-8000-000000000010',
    '59000000-0000-4000-8000-000000000001',
    'assign',
    '[{"caseId":"59000000-0000-4000-8000-000000000021","expectedStateVersion":1,"assignment":"assign_to_me"},{"caseId":"59000000-0000-4000-8000-000000000022","expectedStateVersion":1,"assignment":"assign_to_me"}]'::jsonb,
    'loss-desk-bulk-assign-1'
  );
  if coalesce((v_replay ->> 'replayed')::boolean, false) is not true
     or (v_replay ->> 'writes_performed')::integer <> 0
     or v_replay -> 'batch_receipt' ->> 'id' is distinct from v_result -> 'batch_receipt' ->> 'id' then
    raise exception 'atomic bulk assignment replay changed its receipt or write count';
  end if;

  begin
    perform public.bulk_transition_payout_cases(
      '59000000-0000-4000-8000-000000000010',
      '59000000-0000-4000-8000-000000000001',
      'assign',
      '[{"caseId":"59000000-0000-4000-8000-000000000021","expectedStateVersion":2,"assignment":"unassign"},{"caseId":"59000000-0000-4000-8000-000000000022","expectedStateVersion":999,"assignment":"unassign"}]'::jsonb,
      'loss-desk-bulk-assign-stale'
    );
  exception when serialization_failure then
    v_failed := true;
  end;
  if not v_failed
     or (select count(*) from public.support_payout_cases
         where merchant_id = '59000000-0000-4000-8000-000000000010'
           and assigned_to = '59000000-0000-4000-8000-000000000001'
           and state_version = 2) <> 2 then
    raise exception 'stale bulk preflight did not preserve all-or-nothing state';
  end if;
end
$proof$;

do $proof$
declare
  v_run jsonb;
  v_replay jsonb;
  v_close jsonb;
  v_close_replay jsonb;
  v_immutable boolean := false;
begin
  v_run := public.record_report_run_snapshot(
    '59000000-0000-4000-8000-000000000010',
    '59000000-0000-4000-8000-000000000001',
    'financial',
    '{"range":"30d","timezone":"Europe/London","currency":"GBP","measure":"amount"}'::jsonb,
    '{"recordCount":2,"generatedAt":"2026-08-31T12:00:00Z"}'::jsonb,
    2, '2026-08-31T12:00:00Z', 'loss-desk-report-run-1'
  );
  v_replay := public.record_report_run_snapshot(
    '59000000-0000-4000-8000-000000000010',
    '59000000-0000-4000-8000-000000000001',
    'financial',
    '{"range":"30d","timezone":"Europe/London","currency":"GBP","measure":"amount"}'::jsonb,
    '{"recordCount":2,"generatedAt":"2026-08-31T12:00:00Z"}'::jsonb,
    2, '2026-08-31T12:00:00Z', 'loss-desk-report-run-1'
  );
  if v_run -> 'auditReceipt' ->> 'domainEventId' is null
     or v_replay -> 'auditReceipt' ->> 'domainEventId' is distinct from v_run -> 'auditReceipt' ->> 'domainEventId'
     or coalesce((v_replay ->> 'replayed')::boolean, false) is not true
     or (v_replay ->> 'writesPerformed')::integer <> 0 then
    raise exception 'immutable report snapshot did not replay its durable receipt';
  end if;

  v_close := public.close_financial_period(
    '59000000-0000-4000-8000-000000000010',
    '59000000-0000-4000-8000-000000000001',
    '2026-08', '2026-07-31T23:00:00Z', '2026-08-31T23:00:00Z',
    '{}'::uuid[], 'Reviewed synthetic period', 'loss-desk-period-close-1'
  );
  v_close_replay := public.close_financial_period(
    '59000000-0000-4000-8000-000000000010',
    '59000000-0000-4000-8000-000000000001',
    '2026-08', '2026-07-31T23:00:00Z', '2026-08-31T23:00:00Z',
    '{}'::uuid[], 'Reviewed synthetic period', 'loss-desk-period-close-1'
  );
  if v_close -> 'auditReceipt' ->> 'domainEventId' is null
     or v_close_replay -> 'auditReceipt' ->> 'domainEventId' is distinct from v_close -> 'auditReceipt' ->> 'domainEventId'
     or coalesce((v_close_replay ->> 'replayed')::boolean, false) is not true
     or (v_close_replay ->> 'externalActionsPerformed')::integer <> 0 then
    raise exception 'period close did not replay its append-only audit receipt';
  end if;

  begin
    update public.report_run_snapshots set record_count = 99
    where id = (v_run -> 'run' ->> 'id')::uuid;
  exception when others then
    v_immutable := true;
  end;
  if not v_immutable then
    raise exception 'report run snapshot was mutable';
  end if;
end
$proof$;

select 'LOSS_DESK_DURABLE_CAPABILITIES_PASS' as result;
rollback;
