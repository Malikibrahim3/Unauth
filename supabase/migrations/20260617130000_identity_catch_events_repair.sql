-- Repair identity_catch_events after 20260615100000 was marked applied without
-- creating the table. The original migration FK-referenced evidence_packages,
-- which does not exist in the v2 schema (no v2 equivalent; see claim_evidence).

create table if not exists public.identity_catch_events (
  id uuid primary key default gen_random_uuid(),

  merchant_id uuid not null
    references public.merchants(id) on delete cascade,
  claim_id uuid
    references public.claims(id) on delete set null,
  order_id uuid
    references public.source_orders(id) on delete set null,
  profile_id uuid
    references public.identities(id) on delete set null,

  submitted_identifier_hash text not null,
  linked_identifier_hash     text not null,

  submitted_identifier_display text,
  linked_identifier_display    text,

  matched_signal_types text[] not null default '{}',

  confidence_score smallint not null default 0
    check (confidence_score between 0 and 100),
  confidence_grade text not null
    check (confidence_grade in ('definite', 'probable', 'possible', 'weak')),

  estimated_exposure_amount   numeric(12, 2),
  estimated_exposure_currency char(3) not null default 'GBP',

  evidence_pack_id uuid,

  dismissed_at timestamptz,

  created_at timestamptz not null default now()
);

comment on table public.identity_catch_events is
  'Identity-resolution catch moments. One record per detected link between a submitted identifier and an existing profile. Written by ingest pipeline; read by merchant UI.';

comment on column public.identity_catch_events.submitted_identifier_display is
  'Pre-masked display string for the identifier submitted on this claim (e.g. "m***k+r***@gmail.com"). Never raw PII.';

comment on column public.identity_catch_events.estimated_exposure_amount is
  'Claim/order value at time of catch. Label in UI as "Estimated exposure" — not a confirmed saved amount.';

create unique index if not exists identity_catch_events_claim_pair_uidx
  on public.identity_catch_events (claim_id, submitted_identifier_hash, linked_identifier_hash)
  where claim_id is not null;

create index if not exists identity_catch_events_merchant_created_idx
  on public.identity_catch_events (merchant_id, created_at desc);

create index if not exists identity_catch_events_claim_id_idx
  on public.identity_catch_events (claim_id)
  where claim_id is not null;

create index if not exists identity_catch_events_profile_id_idx
  on public.identity_catch_events (profile_id)
  where profile_id is not null;

alter table public.identity_catch_events enable row level security;

drop policy if exists "merchant read own catch events" on public.identity_catch_events;
create policy "merchant read own catch events"
  on public.identity_catch_events
  for select
  using (
    merchant_id in (
      select merchant_id
      from public.merchant_users
      where user_id = auth.uid()
    )
  );

drop policy if exists "service role manage catch events" on public.identity_catch_events;
create policy "service role manage catch events"
  on public.identity_catch_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant all on public.identity_catch_events to service_role;
grant select on public.identity_catch_events to authenticated;
