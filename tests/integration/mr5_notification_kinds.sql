\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '57000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'mr5-notifications@unauth.test', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb, now(), now()
);

insert into public.merchants (id, name, is_demo) values (
  '57000000-0000-4000-8000-000000000002',
  'MR5 notification contract',
  true
);

insert into public.notifications (
  id, merchant_id, recipient_user_id, kind, title, target_href,
  deduplication_key
) values (
  '57000000-0000-4000-8000-000000000003',
  '57000000-0000-4000-8000-000000000002',
  '57000000-0000-4000-8000-000000000001',
  'assignment', 'Supported assignment', '/work', 'mr5:supported'
);

do $proof$
begin
  begin
    insert into public.notifications (
      merchant_id, recipient_user_id, kind, title, target_href,
      deduplication_key
    ) values (
      '57000000-0000-4000-8000-000000000002',
      '57000000-0000-4000-8000-000000000001',
      'daily_work_summary', 'Unsupported summary', '/work',
      'mr5:unsupported-summary'
    );
    raise exception 'MR5 unsupported notification kind was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.notification_preferences (
      merchant_id, user_id, kind, in_app_enabled, email_enabled
    ) values (
      '57000000-0000-4000-8000-000000000002',
      '57000000-0000-4000-8000-000000000001',
      'scheduled_report', true, false
    );
    raise exception 'MR5 unsupported notification preference was accepted';
  exception when check_violation then null;
  end;

  if (select count(*) from public.notifications where merchant_id = '57000000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'MR5 supported notification contract changed unexpectedly';
  end if;
end
$proof$;

select 'MR5_SQL_NOTIFICATION_KINDS_PASS' as result;
rollback;
