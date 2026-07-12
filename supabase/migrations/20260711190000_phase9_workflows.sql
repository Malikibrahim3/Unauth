create table if not exists public.workflow_definitions (
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null, description text, trigger_event_type text not null, conditions jsonb not null default '[]'::jsonb,
  outputs jsonb not null default '[]'::jsonb, active boolean not null default true, version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (merchant_id, name, version)
);
create trigger trg_workflow_definitions_updated before update on public.workflow_definitions for each row execute function set_updated_at();
create index if not exists workflow_definitions_trigger_idx on public.workflow_definitions (merchant_id, trigger_event_type) where active;

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null references public.merchants(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete restrict,
  domain_event_id uuid not null references public.domain_events(id) on delete cascade,
  status text not null check (status in ('matched','not_matched','completed','failed')), error text,
  started_at timestamptz not null default now(), completed_at timestamptz,
  unique (workflow_definition_id, domain_event_id)
);
create index if not exists workflow_runs_merchant_idx on public.workflow_runs (merchant_id, started_at desc);

create table if not exists public.workflow_step_runs (
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null references public.merchants(id) on delete cascade,
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  step_index integer not null, output_type text not null, status text not null check (status in ('pending','completed','failed','skipped')),
  result jsonb not null default '{}'::jsonb, error text, created_at timestamptz not null default now(), completed_at timestamptz,
  unique (workflow_run_id, step_index)
);

alter table public.workflow_definitions enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_step_runs enable row level security;
create policy workflow_definitions_member_select on public.workflow_definitions for select to authenticated using (is_merchant_member(merchant_id));
create policy workflow_runs_member_select on public.workflow_runs for select to authenticated using (is_merchant_member(merchant_id));
create policy workflow_step_runs_member_select on public.workflow_step_runs for select to authenticated using (is_merchant_member(merchant_id));
grant select on public.workflow_definitions, public.workflow_runs, public.workflow_step_runs to authenticated;
grant all on public.workflow_definitions, public.workflow_runs, public.workflow_step_runs to service_role;
