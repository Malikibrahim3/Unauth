\set ON_ERROR_STOP on

begin;

insert into public.merchants (id, name, is_demo) values
  ('51000000-0000-4000-8000-000000000001', 'MR5 deletion merchant', true),
  ('51000000-0000-4000-8000-000000000002', 'MR5 idempotency neighbour', true);

insert into public.support_payout_cases (
  id, merchant_id, claim_type, status, submitted_at, manual_reference
) values (
  '51000000-0000-4000-8000-000000000003',
  '51000000-0000-4000-8000-000000000001',
  'item_not_received', 'open', now(), 'MR5-DELETE-CASE'
);

insert into public.source_records (
  id, merchant_id, source_system, source_entity_type, external_id,
  canonical_entity_type, canonical_entity_id
) values (
  '51000000-0000-4000-8000-000000000004',
  '51000000-0000-4000-8000-000000000001',
  'shopify', 'order', 'mr5-delete-order', 'support_payout_case',
  '51000000-0000-4000-8000-000000000003'
);

insert into public.domain_events (
  id, merchant_id, event_type, aggregate_type, aggregate_id,
  source_record_id, idempotency_key, payload
) values (
  '51000000-0000-4000-8000-000000000005',
  '51000000-0000-4000-8000-000000000001',
  'case.created', 'support_payout_case',
  '51000000-0000-4000-8000-000000000003',
  '51000000-0000-4000-8000-000000000004',
  'mr5-deletion-domain-event', '{"proof":"guarded history"}'::jsonb
);

insert into public.user_action_log (
  id, merchant_id, actor_role, actor_type, action, resource_type,
  resource_id, metadata, domain_event_id
) values (
  '51000000-0000-4000-8000-000000000006',
  '51000000-0000-4000-8000-000000000001',
  'owner', 'user', 'mr5_workspace_deletion_fixture', 'support_payout_case',
  '51000000-0000-4000-8000-000000000003', '{"proof":"guarded audit"}'::jsonb,
  '51000000-0000-4000-8000-000000000005'
);

-- The same actor-generated key is valid in two different workspaces. A retry
-- remains scoped to actor + workspace + key rather than returning another
-- workspace's job.
insert into public.workspace_deletion_jobs (
  id, merchant_reference, actor_user_reference, idempotency_key, status, stage
) values
  (
    '51000000-0000-4000-8000-000000000007',
    '51000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000009',
    'shared-client-key', 'running', 'database_cleanup'
  ),
  (
    '51000000-0000-4000-8000-000000000008',
    '51000000-0000-4000-8000-000000000002',
    '51000000-0000-4000-8000-000000000009',
    'shared-client-key', 'pending', 'preflight'
  );

select public.purge_workspace_database_v1(
  '51000000-0000-4000-8000-000000000007',
  '51000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000009'
);

do $proof$
begin
  if exists (select 1 from public.merchants where id = '51000000-0000-4000-8000-000000000001') then
    raise exception 'MR5 workspace merchant row survived deletion';
  end if;
  if exists (select 1 from public.source_records where merchant_id = '51000000-0000-4000-8000-000000000001')
     or exists (select 1 from public.domain_events where merchant_id = '51000000-0000-4000-8000-000000000001')
     or exists (select 1 from public.user_action_log where merchant_id = '51000000-0000-4000-8000-000000000001') then
    raise exception 'MR5 guarded merchant history survived deletion';
  end if;
  if not exists (
    select 1 from public.workspace_deletion_jobs
    where id = '51000000-0000-4000-8000-000000000007'
      and status = 'running' and stage = 'verification'
  ) then
    raise exception 'MR5 deletion job did not survive at verification stage';
  end if;
  if not exists (select 1 from public.merchants where id = '51000000-0000-4000-8000-000000000002') then
    raise exception 'MR5 neighbouring workspace was deleted';
  end if;
end
$proof$;

select public.finalize_workspace_deletion_v1(
  '51000000-0000-4000-8000-000000000007',
  '{"manifested_storage_absent":true,"simulated_failure_resumed":true}'::jsonb
);

do $proof$
begin
  if not exists (
    select 1
    from public.workspace_deletion_jobs job
    join public.workspace_deletion_receipts receipt on receipt.id = job.receipt_id
    where job.id = '51000000-0000-4000-8000-000000000007'
      and job.status = 'completed' and job.stage = 'completed'
      and receipt.merchant_reference = '51000000-0000-4000-8000-000000000001'
      and receipt.actor_user_reference = '51000000-0000-4000-8000-000000000009'
      and (receipt.verification->>'merchant_row_absent')::boolean
      and (receipt.verification->>'auth_identity_retained')::boolean
      and (receipt.verification->>'manifested_storage_absent')::boolean
      and receipt.meaning like 'Manifested workspace storage%'
  ) then
    raise exception 'MR5 durable deletion receipt is incomplete';
  end if;

  begin
    update public.workspace_deletion_receipts
    set meaning = 'rewritten'
    where job_reference = '51000000-0000-4000-8000-000000000007';
    raise exception 'MR5 deletion receipt mutation unexpectedly succeeded';
  exception when sqlstate 'P0001' then null;
  end;
end
$proof$;

select 'MR5_SQL_WORKSPACE_DELETION_PASS' as result;
rollback;
