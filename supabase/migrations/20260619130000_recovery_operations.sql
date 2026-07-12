-- 20260619130000_recovery_operations.sql
--
-- Adds first-class recovery operations without changing the support payout
-- case lifecycle. Recovery cases are optional chase-up records linked to
-- support_payout_cases when a loss is recoverable or needs partner follow-up.

begin;

do $$ begin
  create type partner_type as enum (
    'carrier',
    'three_pl',
    'warehouse',
    'supplier',
    'returns_provider',
    'payment_dispute_provider',
    'internal_team',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type partner_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recovery_case_type as enum (
    'carrier_claim',
    'three_pl_claim',
    'warehouse_error',
    'supplier_defect',
    'packaging_issue',
    'returns_provider_claim',
    'chargeback_evidence',
    'internal_policy_fix',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type recovery_rule_claim_type as enum (
    'item_not_received',
    'damaged_item',
    'wrong_item',
    'missing_item',
    'late_delivery',
    'returnless_refund',
    'discount_request',
    'store_credit_request',
    'chargeback_related',
    'replacement_request',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type recovery_liability_cap_basis as enum (
    'fixed',
    'declared_value',
    'insured_value',
    'contractual',
    'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type recovery_submission_method as enum (
    'portal',
    'email',
    'api',
    'manual',
    'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type recovery_rule_source_type as enum (
    'unauth_default',
    'merchant_configured',
    'contract_extracted',
    'manual'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type recovery_confidence as enum ('high', 'medium', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recovery_case_owner_type as enum (
    'carrier',
    'three_pl',
    'warehouse',
    'supplier',
    'returns_provider',
    'payment_dispute_provider',
    'merchant_support',
    'merchant_ops',
    'merchant_finance',
    'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type recovery_case_status as enum (
    'draft',
    'evidence_needed',
    'ready_to_submit',
    'submitted',
    'waiting_response',
    'chase_due',
    'approved',
    'partially_approved',
    'rejected',
    'appealed',
    'paid',
    'closed_unrecoverable'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type recovery_case_event_type as enum (
    'created',
    'status_changed',
    'evidence_added',
    'submitted',
    'chased',
    'approved',
    'partially_approved',
    'rejected',
    'appealed',
    'paid',
    'closed'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.partners (
  id                 uuid primary key default gen_random_uuid(),
  merchant_id        uuid not null references public.merchants(id) on delete cascade,
  partner_type       partner_type not null,
  name               text not null,
  external_reference text,
  contact_email      text,
  contact_url        text,
  notes              text,
  status             partner_status not null default 'active',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_partners_merchant
  on public.partners (merchant_id);
create index if not exists idx_partners_partner_type
  on public.partners (merchant_id, partner_type);
create index if not exists idx_partners_status
  on public.partners (merchant_id, status);

drop trigger if exists trg_partners_updated on public.partners;
create trigger trg_partners_updated before update on public.partners
  for each row execute function set_updated_at();

create table if not exists public.partner_recovery_rules (
  id                         uuid primary key default gen_random_uuid(),
  merchant_id                uuid not null references public.merchants(id) on delete cascade,
  partner_id                 uuid references public.partners(id) on delete set null,
  rule_name                  text not null,
  recovery_type              recovery_case_type not null,
  applies_to_claim_type      recovery_rule_claim_type not null,
  claimable_costs            text[] not null default '{}',
  excluded_costs             text[] not null default '{}',
  required_evidence          text[] not null default '{}',
  deadline_days              integer check (deadline_days is null or deadline_days >= 0),
  liability_cap_amount       numeric(12,2),
  liability_cap_currency     text,
  liability_cap_basis        recovery_liability_cap_basis,
  submission_method          recovery_submission_method,
  submission_url             text,
  submission_email           text,
  source_type                recovery_rule_source_type not null default 'manual',
  confidence                 recovery_confidence not null default 'medium',
  active                     boolean not null default true,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index if not exists idx_partner_recovery_rules_merchant
  on public.partner_recovery_rules (merchant_id);
create index if not exists idx_partner_recovery_rules_partner
  on public.partner_recovery_rules (partner_id)
  where partner_id is not null;
create index if not exists idx_partner_recovery_rules_recovery_type
  on public.partner_recovery_rules (merchant_id, recovery_type);
create index if not exists idx_partner_recovery_rules_claim_type
  on public.partner_recovery_rules (merchant_id, applies_to_claim_type);
create index if not exists idx_partner_recovery_rules_active
  on public.partner_recovery_rules (merchant_id, active);

drop trigger if exists trg_partner_recovery_rules_updated on public.partner_recovery_rules;
create trigger trg_partner_recovery_rules_updated before update on public.partner_recovery_rules
  for each row execute function set_updated_at();

create table if not exists public.recovery_cases (
  id                         uuid primary key default gen_random_uuid(),
  merchant_id                uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id     uuid not null references public.support_payout_cases(id) on delete cascade,
  partner_id                 uuid references public.partners(id) on delete set null,
  recovery_type              recovery_case_type not null,
  owner_type                 recovery_case_owner_type not null default 'unknown',
  status                     recovery_case_status not null default 'draft',
  merchant_loss_amount       numeric(12,2) not null default 0,
  eligible_loss_amount       numeric(12,2),
  estimated_recoverable_min  numeric(12,2),
  estimated_recoverable_max  numeric(12,2),
  amount_recovered           numeric(12,2),
  currency                   text not null default 'USD',
  deadline_at                timestamptz,
  next_chase_at              timestamptz,
  last_chased_at             timestamptz,
  evidence_required          text[] not null default '{}',
  evidence_missing           text[] not null default '{}',
  evidence_complete          boolean not null default false,
  rejection_reason           text,
  calculation_reason         text[] not null default '{}',
  excluded_costs             jsonb not null default '[]'::jsonb,
  internal_owner_user_id     uuid references auth.users(id) on delete set null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint recovery_cases_nonnegative_amounts check (
    merchant_loss_amount >= 0
    and (eligible_loss_amount is null or eligible_loss_amount >= 0)
    and (estimated_recoverable_min is null or estimated_recoverable_min >= 0)
    and (estimated_recoverable_max is null or estimated_recoverable_max >= 0)
    and (amount_recovered is null or amount_recovered >= 0)
  )
);

create index if not exists idx_recovery_cases_merchant
  on public.recovery_cases (merchant_id);
create index if not exists idx_recovery_cases_support_payout_case
  on public.recovery_cases (support_payout_case_id);
create index if not exists idx_recovery_cases_partner
  on public.recovery_cases (partner_id)
  where partner_id is not null;
create index if not exists idx_recovery_cases_status
  on public.recovery_cases (merchant_id, status);
create index if not exists idx_recovery_cases_deadline
  on public.recovery_cases (merchant_id, deadline_at)
  where deadline_at is not null;
create index if not exists idx_recovery_cases_next_chase
  on public.recovery_cases (merchant_id, next_chase_at)
  where next_chase_at is not null;
create index if not exists idx_recovery_cases_recovery_type
  on public.recovery_cases (merchant_id, recovery_type);

drop trigger if exists trg_recovery_cases_updated on public.recovery_cases;
create trigger trg_recovery_cases_updated before update on public.recovery_cases
  for each row execute function set_updated_at();

create table if not exists public.recovery_case_events (
  id               uuid primary key default gen_random_uuid(),
  merchant_id      uuid not null references public.merchants(id) on delete cascade,
  recovery_case_id uuid not null references public.recovery_cases(id) on delete cascade,
  event_type       recovery_case_event_type not null,
  from_status      recovery_case_status,
  to_status        recovery_case_status,
  note             text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists idx_recovery_case_events_case
  on public.recovery_case_events (recovery_case_id, created_at desc);
create index if not exists idx_recovery_case_events_merchant
  on public.recovery_case_events (merchant_id, created_at desc);

drop trigger if exists trg_recovery_case_events_noupd on public.recovery_case_events;
create trigger trg_recovery_case_events_noupd before update or delete on public.recovery_case_events
  for each row execute function forbid_mutation();

alter table public.partners enable row level security;
alter table public.partner_recovery_rules enable row level security;
alter table public.recovery_cases enable row level security;
alter table public.recovery_case_events enable row level security;

drop policy if exists partners_member_all on public.partners;
create policy partners_member_all on public.partners
  for all to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

drop policy if exists partner_recovery_rules_member_all on public.partner_recovery_rules;
create policy partner_recovery_rules_member_all on public.partner_recovery_rules
  for all to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

drop policy if exists recovery_cases_member_all on public.recovery_cases;
create policy recovery_cases_member_all on public.recovery_cases
  for all to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

drop policy if exists recovery_case_events_member_select on public.recovery_case_events;
create policy recovery_case_events_member_select on public.recovery_case_events
  for select to authenticated
  using (is_merchant_member(merchant_id));

grant all on public.partners to service_role;
grant all on public.partner_recovery_rules to service_role;
grant all on public.recovery_cases to service_role;
grant all on public.recovery_case_events to service_role;
grant select, insert, update, delete on public.partners to authenticated;
grant select, insert, update, delete on public.partner_recovery_rules to authenticated;
grant select, insert, update, delete on public.recovery_cases to authenticated;
grant select on public.recovery_case_events to authenticated;

-- Extend claim evidence taxonomy. The table remains the same; new values are
-- additive and old evidence_type values continue to validate.
alter table public.claim_evidence
  drop constraint if exists claim_evidence_evidence_type_check;

alter table public.claim_evidence
  add constraint claim_evidence_evidence_type_check
  check (evidence_type in (
    'tracking',
    'proof_of_delivery',
    'customer_message',
    'support_ticket',
    'return_label',
    'warehouse_scan',
    'payment_dispute',
    'note',
    'other',
    'damage_photo',
    'packaging_photo',
    'label_photo',
    'wrong_item_photo',
    'proof_of_value',
    'proof_of_dispatch',
    'delivery_photo',
    'customer_non_receipt_statement',
    'carrier_investigation',
    'warehouse_pick_pack_record',
    'packing_slip',
    'weight_scan',
    'refund_proof',
    'reship_proof',
    'supplier_batch_lot',
    'purchase_order',
    'return_inspection',
    'chargeback_notice',
    'carrier_claim_correspondence',
    'three_pl_dispute_correspondence',
    'supplier_credit_note'
  ));

notify pgrst, 'reload schema';

commit;
