-- rule_evaluations recorded only a rule_id (FK) plus the conditions that
-- matched. If a merchant later edits or deletes that rule, the historical
-- evaluation row silently starts pointing at a different rule definition than
-- the one that actually produced the recommendation. Snapshot the full rule
-- definition (name, description, conditions, action, condition_operator,
-- priority) as it existed at evaluation time, so past evaluations stay
-- accurate regardless of later rule edits.
ALTER TABLE public.rule_evaluations
  ADD COLUMN IF NOT EXISTS rule_snapshot jsonb;
