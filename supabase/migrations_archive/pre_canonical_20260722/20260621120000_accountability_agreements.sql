-- Accountability and agreement rules layer for the post-purchase claim gate.
-- Additive only: no destructive schema changes.

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.support_payout_cases(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  source_system text not null check (source_system in (
    'SHOPIFY','GORGIAS','AFTERSHIP','CARRIER','PAYMENT_PROVIDER',
    'RETURNS_PLATFORM','WAREHOUSE_3PL','MANUAL_UPLOAD','OTHER'
  )),
  evidence_type text not null check (evidence_type in (
    'ORDER','REFUND','FULFILLMENT','TRACKING_EVENT','PROOF_OF_DELIVERY',
    'CUSTOMER_MESSAGE','SUPPORT_NOTE','POLICY_RULE','PAYMENT_EVENT',
    'CHARGEBACK','RETURN','WAREHOUSE_PICK_PACK','PHOTO','OTHER'
  )),
  title text,
  summary text,
  occurred_at timestamptz,
  raw_payload jsonb,
  external_url text,
  proves text,
  created_at timestamptz not null default now()
);

create index if not exists evidence_items_claim_idx on public.evidence_items(claim_id, created_at);
create index if not exists evidence_items_merchant_idx on public.evidence_items(merchant_id, source_system, evidence_type);

create table if not exists public.loss_sources (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.support_payout_cases(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  source_type text not null check (source_type in (
    'CUSTOMER_CLAIM','CARRIER_FAILURE','WAREHOUSE_3PL_ERROR',
    'MERCHANT_POLICY_LEAKAGE','SUPPORT_AGENT_OVERRIDE','AI_AGENT_OVERRIDE',
    'PRODUCT_ISSUE','PAYMENT_DISPUTE_RISK','RETURN_ABUSE','UNKNOWN'
  )),
  confidence text not null default 'LOW' check (confidence in ('LOW','MEDIUM','HIGH')),
  evidence_summary text,
  evidence_item_ids uuid[] not null default '{}',
  money_at_risk numeric(12,2) not null default 0,
  potential_recovery_amount numeric(12,2) not null default 0,
  accountable_party_type text not null default 'UNKNOWN' check (accountable_party_type in (
    'CUSTOMER','CARRIER','WAREHOUSE_3PL','MERCHANT','SUPPORT_TEAM',
    'AI_AGENT','PAYMENT_PROVIDER','UNKNOWN'
  )),
  accountable_party_name text,
  status text not null default 'open' check (status in (
    'open','investigating','recovery_pending','recovered','written_off','closed',
    'not_economically_recoverable','agreement_excluded','pending_required_evidence',
    'eligible_to_chase','auto_recovery_expected'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loss_sources_claim_idx on public.loss_sources(claim_id);
create index if not exists loss_sources_merchant_type_idx on public.loss_sources(merchant_id, source_type, status);
drop trigger if exists trg_loss_sources_updated on public.loss_sources;
create trigger trg_loss_sources_updated before update on public.loss_sources
  for each row execute function public.set_updated_at();

create table if not exists public.recovery_tasks (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.support_payout_cases(id) on delete cascade,
  loss_source_id uuid references public.loss_sources(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  task_type text not null check (task_type in (
    'OPEN_CARRIER_CLAIM','CONTACT_3PL','REQUEST_CUSTOMER_EVIDENCE',
    'REQUEST_CARRIER_EVIDENCE','ESCALATE_TO_MANAGER','PREPARE_CHARGEBACK_EVIDENCE',
    'REVIEW_POLICY_OVERRIDE','REVIEW_AGENT_ACTION','WRITE_OFF_APPROVAL','OTHER'
  )),
  owner_type text not null default 'UNKNOWN' check (owner_type in (
    'CX_MANAGER','OPS_MANAGER','FINANCE','LOGISTICS','SUPPORT_AGENT','THIRD_PARTY','UNKNOWN'
  )),
  owner_name text,
  owner_email text,
  due_at timestamptz,
  priority text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','URGENT')),
  status text not null default 'open' check (status in (
    'open','in_progress','blocked','completed','cancelled','overdue',
    'not_economically_recoverable','agreement_excluded','pending_required_evidence',
    'eligible_to_chase','auto_recovery_expected'
  )),
  amount_to_recover numeric(12,2) not null default 0,
  recovery_deadline timestamptz,
  external_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recovery_tasks_claim_idx on public.recovery_tasks(claim_id);
create index if not exists recovery_tasks_merchant_status_idx on public.recovery_tasks(merchant_id, status, due_at);
drop trigger if exists trg_recovery_tasks_updated on public.recovery_tasks;
create trigger trg_recovery_tasks_updated before update on public.recovery_tasks
  for each row execute function public.set_updated_at();

create table if not exists public.accountability_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.support_payout_cases(id) on delete cascade,
  loss_source_id uuid references public.loss_sources(id) on delete set null,
  recovery_task_id uuid references public.recovery_tasks(id) on delete set null,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  event_type text not null check (event_type in (
    'SOURCE_CLASSIFIED','ACCOUNTABLE_PARTY_ASSIGNED','RECOVERY_TASK_CREATED',
    'OWNER_ASSIGNED','DEADLINE_UPDATED','TASK_COMPLETED','MONEY_RECOVERED',
    'MONEY_WRITTEN_OFF','OVERRIDE_RECORDED','CASE_CLOSED'
  )),
  actor_type text not null default 'SYSTEM' check (actor_type in ('SYSTEM','HUMAN_AGENT','AI_AGENT','MANAGER','ADMIN')),
  actor_name text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists accountability_events_claim_idx on public.accountability_events(claim_id, created_at);
create index if not exists accountability_events_merchant_idx on public.accountability_events(merchant_id, event_type, created_at);

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  agreement_type text not null check (agreement_type in (
    'COURIER','WAREHOUSE_3PL','PAYMENT_PROVIDER','INSURANCE',
    'RETURNS_PLATFORM','MARKETPLACE','INTERNAL_POLICY','OTHER'
  )),
  counterparty_name text,
  service_name text,
  document_name text,
  document_url text,
  file_mime_type text,
  file_size_bytes integer,
  status text not null default 'uploaded' check (status in (
    'uploaded','parsing','parsed','needs_review','active','archived','failed'
  )),
  effective_from date,
  effective_to date,
  version_label text,
  raw_text text,
  uploaded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agreements_merchant_idx on public.agreements(merchant_id, agreement_type, status);
drop trigger if exists trg_agreements_updated on public.agreements;
create trigger trg_agreements_updated before update on public.agreements
  for each row execute function public.set_updated_at();

create table if not exists public.agreement_clauses (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  clause_type text not null check (clause_type in (
    'MIN_RECOVERABLE_ORDER_VALUE','MAX_RECOVERABLE_ORDER_VALUE','AUTO_REFUND_THRESHOLD',
    'LIABILITY_CAP','CLAIM_WINDOW','EVIDENCE_REQUIRED','EXCLUDED_ITEM_TYPE',
    'SERVICE_LEVEL_ELIGIBILITY','DAMAGE_CLAIM_RULE','LOST_PARCEL_RULE',
    'DELIVERED_NOT_RECEIVED_RULE','DELAY_RULE','PACKAGING_REQUIREMENT',
    'SIGNATURE_REQUIREMENT','PROOF_OF_DELIVERY_REQUIREMENT','CLAIM_SUBMISSION_PROCESS',
    'PAYMENT_DISPUTE_RULE','RECOVERY_FEE','OTHER'
  )),
  clause_text text not null,
  extracted_value jsonb not null default '{}'::jsonb,
  confidence text not null default 'LOW' check (confidence in ('LOW','MEDIUM','HIGH')),
  page_number integer,
  source_location text,
  reviewed boolean not null default false,
  approved boolean not null default false,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists agreement_clauses_agreement_idx on public.agreement_clauses(agreement_id);
create index if not exists agreement_clauses_review_idx on public.agreement_clauses(merchant_id, reviewed, approved);

create table if not exists public.agreement_rules (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  clause_id uuid references public.agreement_clauses(id) on delete set null,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  counterparty_name text,
  rule_code text not null,
  rule_name text not null,
  rule_type text not null check (rule_type in (
    'RECOVERY_ELIGIBILITY','RECOVERY_NOT_WORTH_CHASING','AUTO_RECOVERY_ELIGIBLE',
    'EVIDENCE_REQUIREMENT','DEADLINE','LIABILITY_CAP','EXCLUSION',
    'ESCALATION','INTERNAL_POLICY'
  )),
  applies_to_claim_type text not null default 'ANY' check (applies_to_claim_type in (
    'DELIVERED_NOT_RECEIVED','ITEM_NOT_RECEIVED','LOST_PARCEL','DAMAGED_ITEM',
    'MISSING_ITEM','WRONG_ITEM','DELAYED_DELIVERY','RETURN_EXCEPTION','CHARGEBACK','ANY'
  )),
  conditions jsonb not null,
  result jsonb not null,
  priority integer not null default 100,
  status text not null default 'draft' check (status in ('draft','active','inactive','archived')),
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, rule_code)
);

create index if not exists agreement_rules_merchant_idx on public.agreement_rules(merchant_id, status, priority);
create index if not exists agreement_rules_agreement_idx on public.agreement_rules(agreement_id);
drop trigger if exists trg_agreement_rules_updated on public.agreement_rules;
create trigger trg_agreement_rules_updated before update on public.agreement_rules
  for each row execute function public.set_updated_at();

create table if not exists public.agreement_rule_evaluations (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.support_payout_cases(id) on delete cascade,
  agreement_id uuid references public.agreements(id) on delete set null,
  agreement_rule_id uuid references public.agreement_rules(id) on delete set null,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  matched boolean not null,
  evaluation_summary text,
  result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agreement_rule_evaluations_claim_idx on public.agreement_rule_evaluations(claim_id, created_at);

create table if not exists public.document_upload_jobs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  agreement_id uuid references public.agreements(id) on delete cascade,
  status text not null default 'queued' check (status in (
    'queued','extracting_text','extracting_clauses','generating_rules',
    'needs_review','completed','failed'
  )),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_upload_jobs_merchant_idx on public.document_upload_jobs(merchant_id, status);
drop trigger if exists trg_document_upload_jobs_updated on public.document_upload_jobs;
create trigger trg_document_upload_jobs_updated before update on public.document_upload_jobs
  for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array[
    'evidence_items','loss_sources','recovery_tasks','accountability_events',
    'agreements','agreement_clauses','agreement_rules','agreement_rule_evaluations',
    'document_upload_jobs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'drop policy if exists %I_member_select on public.%I',
      t, t
    );
    execute format(
      'create policy %I_member_select on public.%I for select to authenticated using (public.is_merchant_member(merchant_id))',
      t, t
    );
    execute format('grant all on public.%I to service_role', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

