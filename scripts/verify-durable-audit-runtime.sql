\set ON_ERROR_STOP on

begin;
set local client_min_messages = warning;

insert into public.merchants (id, name)
values ('10000000-0000-4000-8000-000000000001', 'Synthetic audit runtime merchant');

select set_config(
  'request.headers',
  '{"x-unauth-audit-actor-id":"10000000-0000-4000-8000-000000000002","x-unauth-audit-actor-role":"analyst","x-unauth-audit-correlation-id":"10000000-0000-4000-8000-000000000003","x-unauth-audit-request-ip":"192.0.2.10"}',
  true
);

-- A trigger-backed business mutation and its delivery are visible together.
insert into public.source_orders (
  id, merchant_id, source, external_id, browser_ip, dismissed_by_merchant
) values (
  '10000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000001',
  'manual', 'runtime-order', '192.0.2.20', false
);

update public.source_orders
   set dismissed_by_merchant = true
 where id = '10000000-0000-4000-8000-000000000010';

do $$
declare
  v_event_id uuid;
  v_actor_id uuid;
  v_actor_type text;
  v_correlation_id uuid;
  v_role text;
  v_ip text;
begin
  select id, actor_id, actor_type, correlation_id,
         payload #>> '{audit,actor_role}',
         payload #>> '{audit,metadata,request_ip}'
    into v_event_id, v_actor_id, v_actor_type, v_correlation_id, v_role, v_ip
    from public.domain_events
   where merchant_id = '10000000-0000-4000-8000-000000000001'
     and aggregate_id = '10000000-0000-4000-8000-000000000010'
     and payload #>> '{audit,action}' = 'dismiss_transaction';

  if v_event_id is null then raise exception 'business mutation audit event missing'; end if;
  if v_actor_id <> '10000000-0000-4000-8000-000000000002'::uuid
     or v_actor_type <> 'user'
     or v_correlation_id <> '10000000-0000-4000-8000-000000000003'::uuid
     or v_role <> 'analyst'
     or v_ip <> '192.0.2.10' then
    raise exception 'trusted audit request context was not captured atomically';
  end if;
  if (select count(*) from public.domain_events
       where merchant_id = '10000000-0000-4000-8000-000000000001'
         and aggregate_id = '10000000-0000-4000-8000-000000000010'
         and payload #>> '{audit,action}' = 'dismiss_transaction') <> 1 then
    raise exception 'one business mutation produced duplicate logical audit events';
  end if;
  if (select count(*) from public.domain_event_deliveries
       where domain_event_id = v_event_id and handler_name = 'auditTimelineProjection') <> 1 then
    raise exception 'audit projection delivery missing or duplicated';
  end if;
end;
$$;

-- Force the outbox insert to fail. The surrounding business update must roll
-- back even though the test catches the error and continues.
create function pg_temp.reject_runtime_audit_event()
returns trigger language plpgsql as $$
begin
  if new.event_type = 'audit.action_recorded' then
    raise exception 'synthetic audit store failure';
  end if;
  return new;
end;
$$;
create trigger zz_reject_runtime_audit_event
  before insert on public.domain_events
  for each row execute function pg_temp.reject_runtime_audit_event();

do $$
declare
  v_failed boolean := false;
  v_note text;
begin
  begin
    update public.source_orders
       set note = 'must roll back'
     where id = '10000000-0000-4000-8000-000000000010';
  exception when others then
    v_failed := sqlerrm like '%synthetic audit store failure%';
  end;
  if not v_failed then raise exception 'forced audit failure did not abort mutation'; end if;
  select note into v_note from public.source_orders
   where id = '10000000-0000-4000-8000-000000000010';
  if v_note is not null then raise exception 'business mutation survived audit failure'; end if;
end;
$$;
drop trigger zz_reject_runtime_audit_event on public.domain_events;

-- Idempotent outbox recording registers exactly one event and delivery.
do $$
declare
  v_first uuid;
  v_second uuid;
begin
  select (public.record_domain_event(
    '10000000-0000-4000-8000-000000000001', 'audit.action_recorded',
    'runtime', '10000000-0000-4000-8000-000000000011', 'runtime:idempotent:1',
    '{"audit":{"action":"view_audit_trail","actor_role":"analyst"}}'::jsonb,
    null, null, null, 'user', '10000000-0000-4000-8000-000000000002',
    now(), '10000000-0000-4000-8000-000000000003', null,
    array['auditTimelineProjection']::text[]
  )).id into v_first;
  select (public.record_domain_event(
    '10000000-0000-4000-8000-000000000001', 'audit.action_recorded',
    'runtime', '10000000-0000-4000-8000-000000000011', 'runtime:idempotent:1',
    '{"audit":{"action":"view_audit_trail","actor_role":"analyst"}}'::jsonb,
    null, null, null, 'user', '10000000-0000-4000-8000-000000000002',
    now(), '10000000-0000-4000-8000-000000000003', null,
    array['auditTimelineProjection']::text[]
  )).id into v_second;
  if v_first is distinct from v_second then raise exception 'idempotent replay returned another event'; end if;
  if (select count(*) from public.domain_events where merchant_id = '10000000-0000-4000-8000-000000000001' and idempotency_key = 'runtime:idempotent:1') <> 1
     or (select count(*) from public.domain_event_deliveries where domain_event_id = v_first and handler_name = 'auditTimelineProjection') <> 1 then
    raise exception 'idempotent event/delivery uniqueness failed';
  end if;
end;
$$;

-- Exercise the projection's database-side idempotency and immutability using
-- the same ON CONFLICT contract as auditTimelineProjection.ts.
insert into public.user_action_log (
  merchant_id, domain_event_id, actor_user_id, actor_type, actor_role, action,
  resource_type, resource_id, metadata, request_ip, correlation_id,
  idempotency_reference, effective_at, recorded_at, meaning
)
select merchant_id, id, null, actor_type, 'analyst', 'view_audit_trail',
       aggregate_type, aggregate_id::text, '{}'::jsonb, '192.0.2.10',
       correlation_id, idempotency_key, occurred_at, recorded_at, 'Audit trail viewed'
  from public.domain_events where idempotency_key = 'runtime:idempotent:1'
on conflict (domain_event_id) do nothing;
insert into public.user_action_log (
  merchant_id, domain_event_id, actor_user_id, actor_type, actor_role, action,
  resource_type, resource_id, metadata, request_ip, correlation_id,
  idempotency_reference, effective_at, recorded_at, meaning
)
select merchant_id, id, null, actor_type, 'analyst', 'view_audit_trail',
       aggregate_type, aggregate_id::text, '{}'::jsonb, '192.0.2.10',
       correlation_id, idempotency_key, occurred_at, recorded_at, 'Audit trail viewed'
  from public.domain_events where idempotency_key = 'runtime:idempotent:1'
on conflict (domain_event_id) do nothing;

do $$
declare
  v_row_id uuid;
  v_update_blocked boolean := false;
  v_delete_blocked boolean := false;
begin
  select id into v_row_id from public.user_action_log
   where idempotency_reference = 'runtime:idempotent:1';
  if v_row_id is null or (select count(*) from public.user_action_log where domain_event_id = (
    select id from public.domain_events where idempotency_key = 'runtime:idempotent:1'
  )) <> 1 then raise exception 'projection replay was not idempotent'; end if;
  begin update public.user_action_log set meaning = 'rewritten' where id = v_row_id;
  exception when others then v_update_blocked := sqlerrm like '%append-only%'; end;
  begin delete from public.user_action_log where id = v_row_id;
  exception when others then v_delete_blocked := sqlerrm like '%append-only%'; end;
  if not v_update_blocked or not v_delete_blocked then
    raise exception 'audit timeline accepted a rewrite';
  end if;
end;
$$;

-- Bounded retry, error retention, dead-letter transition, operator recovery,
-- and successful completion.
select public.record_domain_event(
  '10000000-0000-4000-8000-000000000001', 'runtime.retry', 'runtime',
  '10000000-0000-4000-8000-000000000012', 'runtime:retry:1', '{}'::jsonb,
  null, null, null, 'system', null, now(), null, null, array['runtimeRetry']::text[]
);
update public.domain_event_deliveries set max_attempts = 2
 where handler_name = 'runtimeRetry' and merchant_id = '10000000-0000-4000-8000-000000000001';
select count(*) from public.claim_domain_event_deliveries('runtimeRetry', 1, 'runtime-worker-1', 30);

do $$
declare v_id uuid; v_status text; v_attempts int;
begin
  select id, status, attempts into v_id, v_status, v_attempts
    from public.domain_event_deliveries where handler_name = 'runtimeRetry';
  if v_status <> 'processing' or v_attempts <> 1 then raise exception 'first delivery claim failed'; end if;
  perform public.fail_domain_event_delivery(v_id, 'first retained error', 0);
end;
$$;
select count(*) from public.claim_domain_event_deliveries('runtimeRetry', 1, 'runtime-worker-2', 30);

do $$
declare v_id uuid; v_status text; v_attempts int; v_error text;
begin
  select id, status, attempts, last_error into v_id, v_status, v_attempts, v_error
    from public.domain_event_deliveries where handler_name = 'runtimeRetry';
  if v_status <> 'processing' or v_attempts <> 2 or v_error <> 'first retained error' then
    raise exception 'retry did not retain the prior error';
  end if;
  perform public.fail_domain_event_delivery(v_id, 'terminal retained error', 0);
  select status, attempts, last_error into v_status, v_attempts, v_error
    from public.domain_event_deliveries where id = v_id;
  if v_status <> 'dead_letter' or v_attempts <> 2 or v_error <> 'terminal retained error' then
    raise exception 'bounded dead-letter transition failed';
  end if;

  -- This is the same merchant/status-guarded transition used by deadLetterOps.
  update public.domain_event_deliveries
     set status = 'pending', attempts = 0, last_error = null,
         next_attempt_at = now(), leased_by = null, leased_until = null
   where id = v_id
     and merchant_id = '10000000-0000-4000-8000-000000000001'
     and status in ('failed', 'dead_letter');
  if not found then raise exception 'operator recovery could not reset dead letter'; end if;
end;
$$;
select count(*) from public.claim_domain_event_deliveries('runtimeRetry', 1, 'runtime-worker-3', 30);
do $$
declare v_id uuid; v_status text;
begin
  select id into v_id from public.domain_event_deliveries where handler_name = 'runtimeRetry';
  perform public.complete_domain_event_delivery(v_id);
  select status into v_status from public.domain_event_deliveries where id = v_id;
  if v_status <> 'completed' then raise exception 'recovered delivery did not complete'; end if;
end;
$$;

-- Expired worker leases are reclaimed; a final expired lease is dead-lettered.
select public.record_domain_event(
  '10000000-0000-4000-8000-000000000001', 'runtime.lease', 'runtime',
  '10000000-0000-4000-8000-000000000013', 'runtime:lease:1', '{}'::jsonb,
  null, null, null, 'system', null, now(), null, null, array['runtimeLease']::text[]
);
update public.domain_event_deliveries set max_attempts = 2
 where handler_name = 'runtimeLease' and merchant_id = '10000000-0000-4000-8000-000000000001';
select count(*) from public.claim_domain_event_deliveries('runtimeLease', 1, 'lease-worker-1', 1);
update public.domain_event_deliveries set leased_until = now() - interval '1 second'
 where handler_name = 'runtimeLease';
select count(*) from public.claim_domain_event_deliveries('runtimeLease', 1, 'lease-worker-2', 1);
update public.domain_event_deliveries set leased_until = now() - interval '1 second'
 where handler_name = 'runtimeLease';
select count(*) from public.claim_domain_event_deliveries('runtimeLease', 1, 'lease-worker-3', 1);
do $$
declare v_status text; v_attempts int; v_error text;
begin
  select status, attempts, last_error into v_status, v_attempts, v_error
    from public.domain_event_deliveries where handler_name = 'runtimeLease';
  if v_status <> 'dead_letter' or v_attempts <> 2
     or v_error <> 'delivery lease expired after final attempt' then
    raise exception 'expired final lease was not bounded and retained';
  end if;
end;
$$;

-- The erasure receipt is idempotent, non-FK, and append-only.
do $$
declare
  v_first uuid;
  v_second uuid;
  v_update_blocked boolean := false;
  v_delete_blocked boolean := false;
begin
  select (public.record_account_deletion_receipt(
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'account_deletion_requested',
    '10000000-0000-4000-8000-000000000003',
    'runtime:erasure:1', now()
  )).id into v_first;
  select (public.record_account_deletion_receipt(
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'account_deletion_requested',
    '10000000-0000-4000-8000-000000000003',
    'runtime:erasure:1', now()
  )).id into v_second;
  if v_first is distinct from v_second
     or (select count(*) from public.account_deletion_audit_receipts where idempotency_reference = 'runtime:erasure:1') <> 1 then
    raise exception 'erasure receipt idempotency failed';
  end if;
  begin update public.account_deletion_audit_receipts set meaning = 'rewritten' where id = v_first;
  exception when others then v_update_blocked := sqlerrm like '%append-only%'; end;
  begin delete from public.account_deletion_audit_receipts where id = v_first;
  exception when others then v_delete_blocked := sqlerrm like '%append-only%'; end;
  if not v_update_blocked or not v_delete_blocked then
    raise exception 'erasure receipt accepted a rewrite';
  end if;
  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.account_deletion_audit_receipts'::regclass
       and contype = 'f'
  ) then raise exception 'erasure receipt unexpectedly depends on deletable subject rows'; end if;
end;
$$;

-- Exact canonical sensitive-table trigger inventory: no compatibility view or
-- phantom legacy customer_notes relation may be counted.
do $$
declare
  v_actual text[];
  v_expected text[] := array[
    'access_audit_log','accountability_events','case_decisions','case_financial_entries',
    'case_outcomes','connector_action_runs','evidence_download_tokens','evidence_packages',
    'helpdesk_connections','identity_notes','loss_attribution_candidates','loss_cases',
    'merchant_api_keys','merchant_identity_state','merchant_integrations','merchant_rule_versions',
    'merchant_users','record_match_resolutions','recovery_cases','rule_evaluations',
    'source_orders','store_connections','support_payout_cases','sync_jobs',
    'user_permission_grants','workflow_definitions'
  ];
begin
  select array_agg(c.relname order by c.relname) into v_actual
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and t.tgname = 'trg_durable_audit' and not t.tgisinternal;
  if v_actual is distinct from v_expected then
    raise exception 'sensitive trigger inventory mismatch: %', v_actual;
  end if;
  if to_regclass('public.customer_notes') is not null
     or exists (
       select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
        where t.tgname = 'trg_durable_audit' and c.relkind in ('v', 'm')
     ) then
    raise exception 'phantom relation or view trigger present';
  end if;
end;
$$;

rollback;
\echo 'Durable audit PostgreSQL runtime acceptance passed.'
