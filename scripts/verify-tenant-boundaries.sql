\set ON_ERROR_STOP on

begin;
set local client_min_messages = warning;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'viewer-a@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'owner-b@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'revoked@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'owner-a@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'next-owner-b@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.merchants (id, name) values
  ('20000000-0000-4000-8000-000000000010', 'Synthetic merchant A'),
  ('20000000-0000-4000-8000-000000000020', 'Synthetic merchant B');

insert into public.merchant_users (
  id, merchant_id, user_id, invited_email, role, invite_status, accepted_at
) values
  ('20000000-0000-4000-8000-000000000031', '20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000001', 'viewer-a@example.invalid', 'viewer', 'active', now()),
  ('20000000-0000-4000-8000-000000000032', '20000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000002', 'owner-b@example.invalid', 'owner', 'active', now()),
  ('20000000-0000-4000-8000-000000000033', '20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000003', 'revoked@example.invalid', 'admin', 'revoked', now()),
  ('20000000-0000-4000-8000-000000000034', '20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000004', 'owner-a@example.invalid', 'owner', 'active', now()),
  ('20000000-0000-4000-8000-000000000035', '20000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000005', 'next-owner-b@example.invalid', 'analyst', 'active', now());

-- Force the deferred invariant once for fixture validity, then restore transfer mode.
set constraints trg_merchant_owner_cardinality immediate;
set constraints trg_merchant_owner_cardinality deferred;

select public.transfer_merchant_ownership(
  '20000000-0000-4000-8000-000000000020',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000035',
  'tenant-runtime-owner-transfer'
);

do $$
declare
  v_replay jsonb;
  v_last_owner_blocked boolean := false;
  v_extra_owner_blocked boolean := false;
  v_unauthorized_blocked boolean := false;
begin
  if (select count(*) from public.merchant_users
      where merchant_id = '20000000-0000-4000-8000-000000000020'
        and role = 'owner' and invite_status = 'active') <> 1
     or (select role from public.merchant_users where id = '20000000-0000-4000-8000-000000000032') <> 'admin'
     or (select role from public.merchant_users where id = '20000000-0000-4000-8000-000000000035') <> 'owner' then
    raise exception 'ownership transfer did not atomically swap the owner';
  end if;

  v_replay := public.transfer_merchant_ownership(
    '20000000-0000-4000-8000-000000000020',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000035',
    'tenant-runtime-owner-transfer'
  );
  if coalesce((v_replay ->> 'replayed')::boolean, false) is not true
     or (select count(*) from public.domain_events
         where merchant_id = '20000000-0000-4000-8000-000000000020'
           and event_type = 'workspace.ownership_transferred'
           and idempotency_key = 'tenant-runtime-owner-transfer') <> 1 then
    raise exception 'ownership transfer replay was not idempotent';
  end if;

  begin
    update public.merchant_users
       set role = 'admin'
     where id = '20000000-0000-4000-8000-000000000035';
    set constraints trg_merchant_owner_cardinality immediate;
  exception when check_violation then
    v_last_owner_blocked := true;
  end;
  set constraints trg_merchant_owner_cardinality deferred;

  begin
    update public.merchant_users
       set role = 'owner'
     where id = '20000000-0000-4000-8000-000000000032';
  exception when unique_violation then
    v_extra_owner_blocked := true;
  end;

  begin
    perform public.transfer_merchant_ownership(
      '20000000-0000-4000-8000-000000000020',
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000035',
      'tenant-runtime-owner-transfer-unauthorized'
    );
  exception when insufficient_privilege then
    v_unauthorized_blocked := true;
  end;

  if not v_last_owner_blocked or not v_extra_owner_blocked or not v_unauthorized_blocked then
    raise exception 'owner cardinality or transfer authorization guard failed';
  end if;
end;
$$;

-- Identical provider identifiers are valid in distinct tenant scopes.
insert into public.source_orders (
  id, merchant_id, source, external_id, browser_ip, order_number
) values
  ('20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000010', 'manual', 'OVERLAP-ORDER-1', '192.0.2.31', 'OVERLAP-ORDER-1'),
  ('20000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000020', 'manual', 'OVERLAP-ORDER-1', '192.0.2.32', 'OVERLAP-ORDER-1');

insert into public.merchant_rules (id, merchant_id, name, action) values
  ('20000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000010', 'Merchant A rule', 'manual_review'),
  ('20000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000020', 'Merchant B rule', 'manual_review');

do $$
begin
  if (select count(*) from public.source_orders where external_id = 'OVERLAP-ORDER-1') <> 2 then
    raise exception 'overlapping external IDs collided across merchants';
  end if;
  if has_function_privilege('anon', 'public.purge_merchant_source_agnostic(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.purge_merchant_source_agnostic(uuid)', 'execute')
     or has_function_privilege('anon', 'public.record_domain_event(uuid,text,text,uuid,text,jsonb,uuid,uuid,uuid,text,uuid,timestamp with time zone,uuid,uuid,text[])', 'execute')
     or has_function_privilege('authenticated', 'public.claim_domain_event_deliveries(text,integer,text,integer)', 'execute')
     or has_function_privilege('authenticated', 'public.transfer_merchant_ownership(uuid,uuid,uuid,text)', 'execute')
     or has_function_privilege('authenticated', 'public.lookup_network_identity(uuid,jsonb,inet)', 'execute') then
    raise exception 'privileged SECURITY DEFINER RPC remains client-executable';
  end if;
  if not has_function_privilege('authenticated', 'public.is_merchant_member(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.merchant_role(uuid)', 'execute') then
    raise exception 'RLS helper execute grants are missing';
  end if;
end;
$$;

-- Viewer A can read only merchant A rows and cannot mutate business truth.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_write_blocked boolean := false;
  v_cross_write_blocked boolean := false;
begin
  if (select count(*) from public.source_orders) <> 1
     or (select merchant_id from public.source_orders limit 1) <> '20000000-0000-4000-8000-000000000010'::uuid then
    raise exception 'viewer A source-order read crossed merchant boundary';
  end if;
  if exists (
    select 1 from public.source_orders where id = '20000000-0000-4000-8000-000000000021'
  ) then raise exception 'viewer A read merchant B direct ID'; end if;
  if (select count(*) from public.merchant_rules) <> 1 then
    raise exception 'viewer A rule list crossed merchant boundary';
  end if;

  begin
    update public.merchant_rules set name = 'viewer rewrite'
     where id = '20000000-0000-4000-8000-000000000012';
  exception when insufficient_privilege then v_write_blocked := true;
  when others then v_write_blocked := sqlstate in ('42501', 'P0001');
  end;
  begin
    update public.source_orders set note = 'cross-tenant rewrite'
     where id = '20000000-0000-4000-8000-000000000021';
  exception when insufficient_privilege then v_cross_write_blocked := true;
  when others then v_cross_write_blocked := sqlstate in ('42501', 'P0001');
  end;
  if not v_write_blocked or not v_cross_write_blocked then
    raise exception 'viewer retained a direct business-write path';
  end if;
end;
$$;

insert into storage.objects (bucket_id, name, owner, owner_id)
values (
  'merchant-csv-uploads-2',
  '20000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000010/owned.csv',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001'
);

do $$
declare v_cross_storage_blocked boolean := false;
begin
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values (
      'merchant-csv-uploads-2',
      '20000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000020/cross.csv',
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001'
    );
  exception when insufficient_privilege then v_cross_storage_blocked := true;
  when others then v_cross_storage_blocked := sqlstate = '42501';
  end;
  if not v_cross_storage_blocked then raise exception 'cross-merchant Storage insert succeeded'; end if;
end;
$$;

reset role;

-- Former owner B remains an active administrator, sees only merchant B, and
-- cannot read A's per-user Storage object.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.source_orders) <> 1
     or (select merchant_id from public.source_orders limit 1) <> '20000000-0000-4000-8000-000000000020'::uuid then
    raise exception 'owner B source-order read crossed merchant boundary';
  end if;
  if exists (
    select 1 from storage.objects
     where bucket_id = 'merchant-csv-uploads-2'
       and name like '20000000-0000-4000-8000-000000000001/%'
  ) then raise exception 'owner B read viewer A Storage object'; end if;
end;
$$;
reset role;

-- Missing or revoked membership never falls back to global visibility.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if exists (select 1 from public.source_orders)
     or exists (select 1 from public.merchant_rules) then
    raise exception 'revoked membership retained tenant visibility';
  end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000099', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000099","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if exists (select 1 from public.source_orders)
     or exists (select 1 from public.merchant_rules) then
    raise exception 'missing merchant context fell back to global visibility';
  end if;
end;
$$;
reset role;

rollback;
\echo 'Two-merchant RLS, RPC, and Storage boundary acceptance passed.'
