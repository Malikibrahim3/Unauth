-- Align preferences with the exact notification vocabulary and remove the
-- non-functional email flag until a delivery worker is shipped.
begin;

insert into public.notification_preferences(merchant_id,user_id,kind,in_app_enabled,email_enabled,updated_at)
select merchant_id,user_id,
  case kind when 'deadline' then 'approaching_deadline' when 'recovery' then 'recovery_outcome' when 'source_health' then 'sync_failure' end,
  in_app_enabled,false,updated_at
from public.notification_preferences
where kind in ('deadline','recovery','source_health')
on conflict(merchant_id,user_id,kind) do update
set in_app_enabled = excluded.in_app_enabled, email_enabled = false, updated_at = greatest(notification_preferences.updated_at,excluded.updated_at);

delete from public.notification_preferences where kind in ('deadline','recovery','source_health');
update public.notification_preferences set email_enabled=false where email_enabled;

alter table public.notification_preferences drop constraint if exists notification_preferences_kind_check;
alter table public.notification_preferences add constraint notification_preferences_kind_check check(kind in (
  'assignment','mention','approaching_deadline','evidence_update','decision_request',
  'recovery_outcome','sync_failure','daily_work_summary','high_value_case_alert','scheduled_report'
));
alter table public.notification_preferences drop constraint if exists notification_preferences_email_disabled_check;
alter table public.notification_preferences add constraint notification_preferences_email_disabled_check check(email_enabled=false);

commit;
