-- Evidence Scoring Engine — storage layer.
--
-- Per-identity cached evidence score (0–100) + decomposed breakdown. This is a
-- NETWORK-LEVEL resource: it has no merchant_id and is service-role only, like
-- identities / identity_profiles / network_access_log (001_new_schema.sql:761).
-- Disclosure to a merchant is gated downstream (k-anonymity in the widget build
-- path), never by direct authenticated table access.
--
-- Kept in a separate table from resolved identity records so recompute writes
-- stay isolated from the main identity row and the audit trail (score_breakdown,
-- scoring_config_version) has a clean home.

create table public.identity_evidence_scores (
  identity_id            uuid primary key references public.identities(id) on delete cascade,
  evidence_score         integer not null default 0 check (evidence_score between 0 and 100),
  evidence_level         text not null default 'minimal'
    check (evidence_level in ('minimal', 'some', 'substantial', 'extensive')),
  has_sufficient_data    boolean not null default false,
  score_breakdown        jsonb not null default '[]'::jsonb,
  scoring_config_version text not null,
  computed_at            timestamptz not null default now()
);

create index idx_identity_evidence_scores_level on public.identity_evidence_scores(evidence_level);
create index idx_identity_evidence_scores_computed_at on public.identity_evidence_scores(computed_at);

-- RLS: service-role only. No anon/authenticated access by design.
alter table public.identity_evidence_scores enable row level security;

revoke all on public.identity_evidence_scores from anon, authenticated;

create policy "service role manage evidence scores"
  on public.identity_evidence_scores
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Grants (the lesson from 20260617120000_grant_rules_tables.sql: PostgREST access
-- via service_role needs an explicit table grant, applied inline at creation).
-- Intentionally NO grant to authenticated/anon — this is a network-level resource.
grant all on public.identity_evidence_scores to service_role;
