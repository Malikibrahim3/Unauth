-- 20260712110000_case_exceptions.sql
--
-- Phase 12 exception queue. One focused, merchant-scoped queue for situations that
-- genuinely require human attention (unmatched refund, ambiguous replacement,
-- conflicting financial values, match uncertainty, missing recovery result, stale
-- source data, responsibility judgement, unsupported external outcome, write-off
-- reason, merchant policy override). Automatic pipelines raise exceptions instead of
-- guessing; the merchant resolves only the missing decision.
--
-- Idempotent: a stable dedup_key prevents a re-run of live delivery or scheduled
-- reconciliation from raising the same exception twice.

begin;

create table if not exists public.case_exceptions (
  id                       uuid primary key default gen_random_uuid(),
  merchant_id              uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id   uuid references public.support_payout_cases(id) on delete cascade,
  exception_type           text not null check (exception_type in (
    'unmatched_refund','ambiguous_replacement','conflicting_financials',
    'match_uncertainty','missing_recovery_result','stale_source_data',
    'responsibility_judgement','unsupported_external_outcome','write_off_reason',
    'policy_override','other'
  )),
  confidence               text not null default 'probable'
                             check (confidence in ('probable','unknown')),
  status                   text not null default 'open'
                             check (status in ('open','resolved','dismissed')),
  title                    text not null,
  detail                   text,
  context                  jsonb not null default '{}'::jsonb,
  -- Optional provisional-match / source pointers so the resolver has what it needs.
  subject_entity_type      text,
  subject_entity_id        text,
  source_system            text,
  dedup_key                text not null,
  resolution               text,
  resolved_by              uuid references auth.users(id) on delete set null,
  resolved_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (merchant_id, dedup_key)
);

create index if not exists idx_case_exceptions_queue
  on public.case_exceptions (merchant_id, status, created_at desc);
create index if not exists idx_case_exceptions_case
  on public.case_exceptions (merchant_id, support_payout_case_id) where support_payout_case_id is not null;

create trigger trg_case_exceptions_updated before update on public.case_exceptions
  for each row execute function set_updated_at();

alter table public.case_exceptions enable row level security;
drop policy if exists case_exceptions_member_all on public.case_exceptions;
create policy case_exceptions_member_all on public.case_exceptions
  for all to authenticated
  using (public.is_merchant_member(merchant_id))
  with check (public.is_merchant_member(merchant_id));
grant all on public.case_exceptions to service_role;
grant select, insert, update, delete on public.case_exceptions to authenticated;

commit;
