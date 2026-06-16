-- merchant_rules: merchant-configurable fraud recommendation rules
-- Created: 2026-06-16
--
-- Merchants define their own fraud rules in the dashboard. The rules engine
-- (lib/rules-engine.ts) evaluates them against Unauth's identity resolution
-- output and surfaces a recommendation (approve / manual_review / deny) in the
-- Gorgias widget. Unauth never makes its own judgment — the recommendation is
-- purely the output of the merchant's own rules applied to Unauth's signals.
--
-- Design constraints:
--   - Rules are strictly scoped to merchant_id (tenant isolation via RLS).
--   - Conditions are stored as a JSONB array (see lib/rules-engine.ts for the
--     RuleCondition shape and lib/rules/fields.ts for the field catalogue).
--   - Lower priority number = evaluated first (priority 0 before priority 1).

-- ---------------------------------------------------------------------------
-- merchant_rules
-- ---------------------------------------------------------------------------
create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null
    references public.merchants(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  priority integer not null default 0,
  -- conditions stored as JSONB array (see RuleCondition in lib/rules-engine.ts)
  conditions jsonb not null default '[]',
  -- action to recommend when the rule matches
  action text not null check (action in ('approve', 'manual_review', 'deny')),
  -- operator between conditions: 'and' (all must match) or 'or' (any must match)
  condition_operator text not null default 'and'
    check (condition_operator in ('and', 'or')),
  is_default_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.merchant_rules is
  'Merchant-configured fraud recommendation rules. Evaluated by lib/rules-engine.ts against identity signals; output drives the Gorgias widget recommendation.';

-- Lower priority number = evaluated first (priority 0 runs before priority 1)
create index merchant_rules_merchant_priority
  on public.merchant_rules (merchant_id, priority asc)
  where is_active = true;

alter table public.merchant_rules enable row level security;

create policy "merchant manage own rules"
  on public.merchant_rules
  for all
  using (
    merchant_id in (
      select merchant_id from public.merchant_users where user_id = auth.uid()
    )
  )
  with check (
    merchant_id in (
      select merchant_id from public.merchant_users where user_id = auth.uid()
    )
  );

create policy "service role manage rules"
  on public.merchant_rules
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- rule_evaluations (audit log)
-- ---------------------------------------------------------------------------
-- Every evaluation writes a row here — important for future dispute evidence
-- and merchant trust. Never skipped, even when the result is no_match.
create table public.rule_evaluations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null
    references public.merchants(id) on delete cascade,
  claim_id uuid references public.claims(id) on delete set null,
  -- NOTE: resolved identities live in the `identities` table post-v2 cutover.
  identity_id uuid references public.identities(id) on delete set null,
  rule_id uuid references public.merchant_rules(id) on delete set null,
  recommendation text
    check (recommendation in ('approve', 'manual_review', 'deny', 'no_match')),
  matched_conditions jsonb,
  all_rules_evaluated jsonb,
  evaluated_at timestamptz not null default now()
);

comment on table public.rule_evaluations is
  'Audit log of every rules-engine evaluation. Retained for dispute evidence and merchant trust.';

create index rule_evaluations_merchant_claim
  on public.rule_evaluations (merchant_id, claim_id);

create index rule_evaluations_identity
  on public.rule_evaluations (identity_id);

alter table public.rule_evaluations enable row level security;

create policy "merchant read own evaluations"
  on public.rule_evaluations
  for select
  using (
    merchant_id in (
      select merchant_id from public.merchant_users where user_id = auth.uid()
    )
  );

create policy "service role manage evaluations"
  on public.rule_evaluations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- default_rule_templates (global, read-only for merchants)
-- ---------------------------------------------------------------------------
create table public.default_rule_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  conditions jsonb not null,
  action text not null check (action in ('approve', 'manual_review', 'deny')),
  condition_operator text not null default 'and'
    check (condition_operator in ('and', 'or')),
  sort_order integer not null default 0
);

comment on table public.default_rule_templates is
  'Global starter templates merchants can copy into their own merchant_rules. Not linked — copied.';

alter table public.default_rule_templates enable row level security;

create policy "authenticated read templates"
  on public.default_rule_templates
  for select
  using (auth.role() in ('authenticated', 'service_role'));

create policy "service role manage templates"
  on public.default_rule_templates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.default_rule_templates
  (name, description, conditions, action, condition_operator, sort_order)
values
(
  'Serial Network Abuser',
  'Identity has made 3 or more claims across the network with high confidence',
  '[
    {"id":"t1-c1","field":"network_claim_count","operator":"gte","value":3},
    {"id":"t1-c2","field":"confidence_grade","operator":"in","value":["definite","probable"]}
  ]',
  'manual_review',
  'and',
  0
),
(
  'Known Cross-Merchant Fraudster',
  'Identity is definitively matched across multiple merchants and has been flagged',
  '[
    {"id":"t2-c1","field":"has_cross_merchant_identity","operator":"eq","value":true},
    {"id":"t2-c2","field":"confidence_grade","operator":"eq","value":"definite"},
    {"id":"t2-c3","field":"is_network_flagged","operator":"eq","value":true}
  ]',
  'deny',
  'and',
  1
),
(
  'First Time Claimant',
  'No prior claims at this merchant or in the network',
  '[
    {"id":"t3-c1","field":"merchant_claim_count","operator":"lte","value":1},
    {"id":"t3-c2","field":"network_claim_count","operator":"eq","value":0}
  ]',
  'approve',
  'and',
  2
),
(
  'High Value Order Review',
  'Order value above threshold regardless of claim history',
  '[
    {"id":"t4-c1","field":"order_value_usd","operator":"gte","value":500}
  ]',
  'manual_review',
  'and',
  3
);
