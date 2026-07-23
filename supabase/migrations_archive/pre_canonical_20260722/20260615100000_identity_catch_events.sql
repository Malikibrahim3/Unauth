-- identity_catch_events: first-class events for identity-resolution catches
-- Created: 2026-06-15
--
-- One record per claim where a non-obvious identity link was detected by the
-- resolution pipeline. Written by service role (ingest/linker); read by merchants
-- through RLS.
--
-- Design constraints:
--   - No raw PII stored here. submitted_identifier_display and
--     linked_identifier_display are pre-masked by the pipeline ("m***k@gmail.com").
--   - submitted_identifier_hash / linked_identifier_hash are SHA-256 digests
--     from lib/identity/hash.ts — suitable for dedup but not reversible.
--   - estimated_exposure_amount is the claim/order value at time of catch,
--     not a guaranteed saved amount. UI must label it "Estimated exposure".

create table public.identity_catch_events (
  id uuid primary key default gen_random_uuid(),

  merchant_id uuid not null
    references public.merchants(id) on delete cascade,
  claim_id uuid
    references public.claims(id) on delete set null,
  order_id uuid
    references public.source_orders(id) on delete set null,
  profile_id uuid
    references public.identities(id) on delete set null,

  -- Hashed identifiers (SHA-256, lib/identity/hash.ts)
  submitted_identifier_hash text not null,
  linked_identifier_hash     text not null,

  -- Masked display strings for merchant UI — no raw PII
  submitted_identifier_display text,
  linked_identifier_display    text,

  -- Signal types that produced the match.
  -- Canonical values: email_variant, address_hash, phone_hash, device_fp,
  -- card_match, name_variant, ip_cluster, claim_pattern, checkout_signal
  matched_signal_types text[] not null default '{}',

  confidence_score smallint not null default 0
    check (confidence_score between 0 and 100),
  confidence_grade text not null
    check (confidence_grade in ('definite', 'probable', 'possible', 'weak')),

  -- Estimated financial exposure from the linked claim/order at catch time
  estimated_exposure_amount   numeric(12, 2),
  estimated_exposure_currency char(3) not null default 'GBP',

  -- Optional link to a future evidence artifact. No FK: evidence_packages was
  -- dropped in the v2 schema rebuild (claim_evidence is the v2 equivalent).
  evidence_pack_id uuid,

  -- Soft-delete: dismissed events are hidden from the feed but retained for audit
  dismissed_at timestamptz,

  created_at timestamptz not null default now()
);

comment on table public.identity_catch_events is
  'Identity-resolution catch moments. One record per detected link between a submitted identifier and an existing profile. Written by ingest pipeline; read by merchant UI.';

comment on column public.identity_catch_events.submitted_identifier_display is
  'Pre-masked display string for the identifier submitted on this claim (e.g. "m***k+r***@gmail.com"). Never raw PII.';

comment on column public.identity_catch_events.estimated_exposure_amount is
  'Claim/order value at time of catch. Label in UI as "Estimated exposure" — not a confirmed saved amount.';

-- One catch per (claim, identity pair) prevents re-run duplicates
create unique index identity_catch_events_claim_pair_uidx
  on public.identity_catch_events (claim_id, submitted_identifier_hash, linked_identifier_hash)
  where claim_id is not null;

create index identity_catch_events_merchant_created_idx
  on public.identity_catch_events (merchant_id, created_at desc);

create index identity_catch_events_claim_id_idx
  on public.identity_catch_events (claim_id)
  where claim_id is not null;

create index identity_catch_events_profile_id_idx
  on public.identity_catch_events (profile_id)
  where profile_id is not null;

alter table public.identity_catch_events enable row level security;

-- Merchants read their own catch events
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

-- Service role (ingest pipeline) manages catch events
create policy "service role manage catch events"
  on public.identity_catch_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant all on public.identity_catch_events to service_role;
grant select on public.identity_catch_events to authenticated;
