-- Forward-only repair for environments where reviewed release-1 schema was
-- never applied. These objects are part of the application preflight contract,
-- so their absence must fail deployment rather than be hidden by a client-side
-- fallback.

alter table public.support_payout_cases
  add column if not exists responsibility_confirmation_state text not null default 'unconfirmed',
  add column if not exists responsibility_confirmed_at timestamptz,
  add column if not exists responsibility_confirmed_by uuid,
  add column if not exists responsibility_event_id uuid;

do $block$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_payout_cases_responsibility_confirmed_by_fkey'
      and conrelid = 'public.support_payout_cases'::regclass
  ) then
    alter table public.support_payout_cases
      add constraint support_payout_cases_responsibility_confirmed_by_fkey
        foreign key (responsibility_confirmed_by)
        references auth.users(id)
        on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_payout_cases_responsibility_event_id_fkey'
      and conrelid = 'public.support_payout_cases'::regclass
  ) then
    alter table public.support_payout_cases
      add constraint support_payout_cases_responsibility_event_id_fkey
        foreign key (responsibility_event_id)
        references public.domain_events(id)
        on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_payout_cases_responsibility_state_check'
      and conrelid = 'public.support_payout_cases'::regclass
  ) then
    alter table public.support_payout_cases
      add constraint support_payout_cases_responsibility_state_check
        check (responsibility_confirmation_state in ('unconfirmed', 'confirmed', 'corrected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_payout_cases_responsibility_projection_check'
      and conrelid = 'public.support_payout_cases'::regclass
  ) then
    alter table public.support_payout_cases
      add constraint support_payout_cases_responsibility_projection_check
        check (
          responsibility_confirmation_state = 'unconfirmed'
          or (
            responsibility_confirmed_at is not null
            and responsibility_event_id is not null
          )
        );
  end if;
end;
$block$;

comment on column public.support_payout_cases.responsibility_confirmation_state is
  'Merchant-owned responsibility confirmation state. Automated evaluation may not overwrite confirmed or corrected responsibility.';
comment on column public.support_payout_cases.responsibility_event_id is
  'Immutable domain event that records the current merchant responsibility confirmation.';

create table if not exists public.case_prevention_observations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  decision_id uuid not null references public.case_decisions(id) on delete cascade,
  currency character(3) not null,
  exposure_minor bigint not null check (exposure_minor >= 0),
  decision_at timestamptz not null,
  eligible_at timestamptz not null,
  observation_window_days integer not null default 30 check (observation_window_days >= 30),
  window_basis text not null default 'default_30_calendar_days',
  policy_version text not null default 'mvp-plus-v1',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  domain_event_id uuid references public.domain_events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, decision_id)
);

create index if not exists case_prevention_observations_due_idx
  on public.case_prevention_observations (eligible_at, id)
  where status = 'pending';

alter table public.case_prevention_observations enable row level security;

drop policy if exists case_prevention_observations_member_select
  on public.case_prevention_observations;
create policy case_prevention_observations_member_select
  on public.case_prevention_observations
  for select to authenticated
  using (public.is_merchant_member(merchant_id));

grant select on public.case_prevention_observations to authenticated;
grant select, insert, update, delete on public.case_prevention_observations to service_role;
revoke insert, update, delete on public.case_prevention_observations from anon, authenticated;

comment on table public.case_prevention_observations is
  'Matured prevented-value observations. Missing observations are unavailable, never inferred as zero.';
