-- Evidence scoring default rule templates (sort_order 4–6).
--
-- Adds three starter templates that reference evidence_score, evidence_level,
-- has_sufficient_data, and confidence_grade. Does NOT modify the original four
-- templates seeded in 20260616100000_merchant_rules.sql.
--
-- Guarded inserts (WHERE NOT EXISTS on name) keep dev/reset re-runs idempotent.
-- No unique constraint exists on default_rule_templates.name.

insert into public.default_rule_templates
  (name, description, conditions, action, condition_operator, sort_order)
select
  'Standard Review Threshold',
  'Flags identities with substantial accumulated evidence for manual review',
  '[
    {"id":"t5-c1","field":"evidence_score","operator":"gte","value":45}
  ]'::jsonb,
  'manual_review',
  'and',
  4
where not exists (
  select 1 from public.default_rule_templates where name = 'Standard Review Threshold'
);

insert into public.default_rule_templates
  (name, description, conditions, action, condition_operator, sort_order)
select
  'High Confidence Deny',
  'Denies only when evidence is extensive AND the identity match itself is reliable',
  '[
    {"id":"t6-c1","field":"evidence_score","operator":"gte","value":75},
    {"id":"t6-c2","field":"confidence_grade","operator":"in","value":["definite","probable"]}
  ]'::jsonb,
  'deny',
  'and',
  5
where not exists (
  select 1 from public.default_rule_templates where name = 'High Confidence Deny'
);

insert into public.default_rule_templates
  (name, description, conditions, action, condition_operator, sort_order)
select
  'Clean Identity Fast-Track',
  'Approves identities with minimal evidence where enough data exists to be confident',
  '[
    {"id":"t7-c1","field":"evidence_score","operator":"lte","value":19},
    {"id":"t7-c2","field":"has_sufficient_data","operator":"eq","value":true}
  ]'::jsonb,
  'approve',
  'and',
  6
where not exists (
  select 1 from public.default_rule_templates where name = 'Clean Identity Fast-Track'
);
