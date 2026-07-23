-- Additive columns for steering-aligned recommendations and outcome audit.

begin;

alter table public.support_payout_cases
  add column if not exists recommended_payout_action text,
  add column if not exists recommended_rule_name text,
  add column if not exists recommended_rule_id uuid;

alter table public.claim_outcomes
  add column if not exists recommended_payout_action text,
  add column if not exists followed_recommendation boolean;

comment on column public.support_payout_cases.recommended_payout_action is
  'Steering vocabulary recommendation at last evaluation (approve_payout, ask_for_evidence, …).';

comment on column public.claim_outcomes.followed_recommendation is
  'Whether the merchant-recorded outcome aligned with recommended_payout_action at decision time.';

notify pgrst, 'reload schema';

commit;
