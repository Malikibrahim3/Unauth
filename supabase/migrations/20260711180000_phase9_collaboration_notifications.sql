-- Phase 9 collaboration and notification foundation.
create table if not exists public.case_comments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  evidence_item_id uuid references public.evidence_items(id) on delete set null,
  recovery_case_id uuid references public.recovery_cases(id) on delete set null,
  rule_evaluation_id uuid references public.rule_evaluations(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists case_comments_case_idx
  on public.case_comments (merchant_id, support_payout_case_id, created_at desc);
create trigger trg_case_comments_updated before update on public.case_comments
  for each row execute function set_updated_at();

create table if not exists public.case_comment_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  comment_id uuid not null references public.case_comments(id) on delete cascade,
  event_type text not null check (event_type in ('created','edited','deleted')),
  actor_user_id uuid references auth.users(id) on delete set null,
  body_snapshot text,
  created_at timestamptz not null default now()
);
create index if not exists case_comment_events_comment_idx
  on public.case_comment_events (comment_id, created_at desc);
create trigger trg_case_comment_events_noupd before update or delete on public.case_comment_events
  for each row execute function forbid_mutation();

create table if not exists public.comment_mentions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  comment_id uuid not null references public.case_comments(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, mentioned_user_id)
);
create index if not exists comment_mentions_user_idx
  on public.comment_mentions (merchant_id, mentioned_user_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('assignment','mention','approaching_deadline','evidence_update','decision_request','recovery_outcome','sync_failure','daily_work_summary','high_value_case_alert','scheduled_report')),
  title text not null,
  body text,
  target_href text not null check (target_href like '/%'),
  domain_event_id uuid references public.domain_events(id) on delete set null,
  deduplication_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (merchant_id, recipient_user_id, deduplication_key)
);
create index if not exists notifications_unread_idx
  on public.notifications (merchant_id, recipient_user_id, created_at desc) where read_at is null;

create table if not exists public.notification_preferences (
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (merchant_id, user_id, kind)
);
create trigger trg_notification_preferences_updated before update on public.notification_preferences
  for each row execute function set_updated_at();

alter table public.case_comments enable row level security;
alter table public.case_comment_events enable row level security;
alter table public.comment_mentions enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

create policy case_comments_member_select on public.case_comments for select to authenticated using (is_merchant_member(merchant_id));
create policy case_comment_events_member_select on public.case_comment_events for select to authenticated using (is_merchant_member(merchant_id));
create policy comment_mentions_member_select on public.comment_mentions for select to authenticated using (is_merchant_member(merchant_id));
create policy notifications_recipient_select on public.notifications for select to authenticated using (is_merchant_member(merchant_id) and recipient_user_id = auth.uid());
create policy notification_preferences_own_all on public.notification_preferences for all to authenticated
  using (is_merchant_member(merchant_id) and user_id = auth.uid())
  with check (is_merchant_member(merchant_id) and user_id = auth.uid());

grant select on public.case_comments, public.case_comment_events, public.comment_mentions to authenticated;
grant select on public.notifications to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant all on public.case_comments, public.case_comment_events, public.comment_mentions, public.notifications, public.notification_preferences to service_role;
