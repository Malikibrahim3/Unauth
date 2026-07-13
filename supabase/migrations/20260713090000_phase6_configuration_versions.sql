-- Phase 6: immutable policy versions and explicit workflow publication state.
begin;
create table if not exists public.merchant_rule_versions (
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null references public.merchants(id) on delete cascade,
  merchant_rule_id uuid not null references public.merchant_rules(id) on delete cascade, version integer not null,
  status text not null check(status in ('draft','published','retired')), name text not null, description text,
  conditions jsonb not null default '[]', action text not null, condition_operator text not null default 'and', priority integer not null default 0,
  created_by uuid, published_by uuid, created_at timestamptz not null default now(), published_at timestamptz,
  supersedes_version_id uuid references public.merchant_rule_versions(id) on delete set null,
  unique(merchant_rule_id,version)
);
create unique index if not exists idx_rule_versions_one_draft on public.merchant_rule_versions(merchant_rule_id) where status='draft';
create unique index if not exists idx_rule_versions_one_published on public.merchant_rule_versions(merchant_rule_id) where status='published';
create index if not exists idx_rule_versions_merchant on public.merchant_rule_versions(merchant_id,merchant_rule_id,version desc);
insert into public.merchant_rule_versions(merchant_id,merchant_rule_id,version,status,name,description,conditions,action,condition_operator,priority,published_at)
select merchant_id,id,1,case when is_active then 'published' else 'retired' end,name,description,conditions,action,condition_operator,priority,case when is_active then updated_at end
from public.merchant_rules r where not exists(select 1 from public.merchant_rule_versions v where v.merchant_rule_id=r.id);

alter table public.workflow_definitions add column if not exists status text not null default 'draft' check(status in ('draft','published','retired'));
alter table public.workflow_definitions add column if not exists published_at timestamptz;
alter table public.workflow_definitions add column if not exists published_by uuid;
update public.workflow_definitions set status=case when active then 'published' else 'draft' end,published_at=case when active then updated_at end where published_at is null;
create index if not exists idx_workflow_definitions_family on public.workflow_definitions(merchant_id,name,version desc);
create unique index if not exists idx_workflow_one_published on public.workflow_definitions(merchant_id,name) where status='published';
create unique index if not exists idx_workflow_run_idempotency on public.workflow_runs(workflow_definition_id,domain_event_id);

alter table public.merchant_rule_versions enable row level security;
drop policy if exists merchant_rule_versions_member_select on public.merchant_rule_versions;
create policy merchant_rule_versions_member_select on public.merchant_rule_versions for select to authenticated using(public.is_merchant_member(merchant_id));
commit;
