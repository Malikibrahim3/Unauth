-- 20260620143000_automation_first_loss_recovery.sql
--
-- Broadens recovery operations from delivery/carrier chase-up into source-backed
-- post-purchase loss cases, correspondence, clarification requests, evidence,
-- and immutable audit events. Human users can configure automation and connect
-- providers; factual rows are service-role/source-backed only.

begin;

do $$ begin
  create type loss_case_category as enum (
    'delivery_loss',
    'chargeback_or_payment_dispute',
    'refund_dispute',
    'returns_abuse_or_exception',
    'damaged_goods',
    'wrong_item_or_missing_item',
    'fulfilment_or_warehouse_error',
    '3pl_accountability',
    'shipping_protection_claim',
    'marketplace_dispute',
    'supplier_or_vendor_issue',
    'tax_duty_or_customs_issue',
    'subscription_or_digital_fulfilment_issue',
    'unknown_post_purchase_loss'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type loss_recovery_route as enum (
    'carrier_claim',
    'carrier_service_refund',
    '3pl_claim',
    'shipping_protection_claim',
    'payment_processor_dispute',
    'chargeback_evidence_pack',
    'bank_or_card_network_response',
    'returns_platform_claim',
    'marketplace_claim',
    'supplier_vendor_claim',
    'internal_fulfilment_issue',
    'customer_evidence_review',
    'not_recoverable',
    'needs_more_evidence'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type loss_case_status as enum (
    'detected',
    'collecting_evidence',
    'missing_source_data',
    'needs_external_correspondence',
    'external_correspondence_requested',
    'external_response_received',
    'evidence_pack_ready',
    'submitted',
    'approved',
    'partially_approved',
    'denied',
    'expired',
    'closed_unrecoverable'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type loss_counterparty_type as enum (
    'carrier',
    '3pl',
    'warehouse',
    'payment_processor',
    'bank',
    'card_network',
    'marketplace',
    'returns_provider',
    'shipping_protection_provider',
    'supplier',
    'customs_broker',
    'customer',
    'internal_team',
    'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type loss_source_confidence as enum (
    'source_verified',
    'partial_source_verified',
    'insufficient_source_data'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type external_correspondence_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type external_correspondence_channel as enum (
    'provider_api',
    'gmail',
    'outlook',
    'gorgias',
    'zendesk',
    'intercom',
    'slack',
    'erp',
    'wms',
    'marketplace_portal_api',
    'payment_processor_api'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type correspondence_extraction_status as enum (
    'not_required',
    'pending',
    'extracted',
    'failed',
    'low_confidence'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type external_clarification_request_status as enum (
    'generated',
    'blocked_by_settings',
    'sent',
    'failed',
    'reply_received',
    'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type loss_case_evidence_source_provider as enum (
    'shopify',
    'gorgias',
    'zendesk',
    'intercom',
    'aftership',
    'carrier_api',
    'gmail',
    'outlook',
    'stripe',
    'paypal',
    'adyen',
    'shopify_payments',
    'returns_provider',
    '3pl',
    'wms',
    'erp',
    'marketplace',
    'shipping_protection_provider',
    'supplier_portal',
    'slack'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type evidence_extraction_method as enum (
    'direct_api',
    'webhook',
    'email_parser',
    'helpdesk_parser',
    'llm_extractor',
    'deterministic_rule'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type loss_case_event_type as enum (
    'case_detected',
    'evidence_pulled',
    'missing_evidence_identified',
    'correspondence_ingested',
    'correspondence_matched',
    'correspondence_unmatched',
    'facts_extracted',
    'clarification_request_generated',
    'clarification_request_sent',
    'external_response_received',
    'evidence_pack_generated',
    'claim_submitted',
    'status_synced',
    'case_closed',
    'sync_failed'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.loss_cases (
  id                         uuid primary key default gen_random_uuid(),
  merchant_id                uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id     uuid references public.support_payout_cases(id) on delete set null,
  case_category              loss_case_category not null,
  case_type                  text not null,
  recovery_route             loss_recovery_route not null,
  status                     loss_case_status not null default 'detected',
  order_id                   uuid,
  customer_identity_id       uuid,
  helpdesk_ticket_id         uuid,
  payment_id                 text,
  dispute_id                 text,
  return_id                  text,
  shipment_id                text,
  fulfilment_id              text,
  counterparty_type          loss_counterparty_type not null default 'unknown',
  counterparty_name          text,
  evidence_completion_score  numeric(5,2) not null default 0 check (evidence_completion_score >= 0 and evidence_completion_score <= 100),
  missing_evidence_count     integer not null default 0 check (missing_evidence_count >= 0),
  claim_deadline_at          timestamptz,
  order_value_minor          bigint,
  refund_value_minor         bigint,
  chargeback_value_minor     bigint,
  estimated_recovery_minor   bigint,
  approved_recovery_minor    bigint,
  currency                   text,
  source_confidence          loss_source_confidence not null default 'insufficient_source_data',
  source_fingerprint         text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint loss_cases_nonnegative_minor_amounts check (
    (order_value_minor is null or order_value_minor >= 0)
    and (refund_value_minor is null or refund_value_minor >= 0)
    and (chargeback_value_minor is null or chargeback_value_minor >= 0)
    and (estimated_recovery_minor is null or estimated_recovery_minor >= 0)
    and (approved_recovery_minor is null or approved_recovery_minor >= 0)
  )
);

create index if not exists idx_loss_cases_merchant_status
  on public.loss_cases (merchant_id, status);
create index if not exists idx_loss_cases_category
  on public.loss_cases (merchant_id, case_category);
create index if not exists idx_loss_cases_support_payout_case
  on public.loss_cases (support_payout_case_id)
  where support_payout_case_id is not null;
create index if not exists idx_loss_cases_deadline
  on public.loss_cases (merchant_id, claim_deadline_at)
  where claim_deadline_at is not null;
create unique index if not exists loss_cases_source_fingerprint_unique
  on public.loss_cases (merchant_id, source_fingerprint)
  where source_fingerprint is not null;

drop trigger if exists trg_loss_cases_updated on public.loss_cases;
create trigger trg_loss_cases_updated before update on public.loss_cases
  for each row execute function set_updated_at();

create table if not exists public.loss_case_evidence (
  id                    uuid primary key default gen_random_uuid(),
  merchant_id           uuid not null references public.merchants(id) on delete cascade,
  loss_case_id          uuid not null references public.loss_cases(id) on delete cascade,
  evidence_type         text not null,
  source_provider       loss_case_evidence_source_provider not null,
  source_record_id      text not null,
  source_thread_id      text,
  source_url            text,
  value_json            jsonb not null,
  raw_payload_hash      text not null,
  source_verified       boolean not null default true,
  extracted_by          evidence_extraction_method not null,
  extraction_confidence numeric(5,4) check (extraction_confidence is null or (extraction_confidence >= 0 and extraction_confidence <= 1)),
  pulled_at             timestamptz not null,
  created_at            timestamptz not null default now()
);

create index if not exists idx_loss_case_evidence_case
  on public.loss_case_evidence (loss_case_id, created_at desc);
create unique index if not exists loss_case_evidence_source_unique
  on public.loss_case_evidence (merchant_id, loss_case_id, evidence_type, source_provider, source_record_id, raw_payload_hash);

create table if not exists public.external_correspondence (
  id                   uuid primary key default gen_random_uuid(),
  merchant_id          uuid not null references public.merchants(id) on delete cascade,
  loss_case_id         uuid references public.loss_cases(id) on delete set null,
  direction            external_correspondence_direction not null,
  counterparty_type    loss_counterparty_type not null default 'unknown',
  counterparty_name    text,
  channel              external_correspondence_channel not null,
  source_provider      text not null,
  source_record_id     text not null,
  source_thread_id     text,
  source_url           text,
  subject              text,
  body_hash            text,
  attachment_hashes    text[] not null default '{}',
  matched_confidence   numeric(5,4) not null default 0 check (matched_confidence >= 0 and matched_confidence <= 1),
  extraction_status    correspondence_extraction_status not null default 'pending',
  extracted_facts_json jsonb,
  received_at          timestamptz,
  sent_at              timestamptz,
  pulled_at            timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

create index if not exists idx_external_correspondence_case
  on public.external_correspondence (loss_case_id, created_at desc)
  where loss_case_id is not null;
create index if not exists idx_external_correspondence_thread
  on public.external_correspondence (merchant_id, source_provider, source_thread_id)
  where source_thread_id is not null;
create unique index if not exists external_correspondence_source_unique
  on public.external_correspondence (merchant_id, source_provider, source_record_id, direction);

create table if not exists public.unmatched_correspondence (
  id                   uuid primary key references public.external_correspondence(id) on delete cascade,
  merchant_id          uuid not null references public.merchants(id) on delete cascade,
  source_provider      text not null,
  source_record_id     text not null,
  source_thread_id     text,
  source_url           text,
  candidate_json       jsonb not null default '{}'::jsonb,
  reason               text not null,
  created_at           timestamptz not null default now()
);

create index if not exists idx_unmatched_correspondence_merchant
  on public.unmatched_correspondence (merchant_id, created_at desc);

create table if not exists public.external_clarification_requests (
  id                         uuid primary key default gen_random_uuid(),
  merchant_id                uuid not null references public.merchants(id) on delete cascade,
  loss_case_id               uuid not null references public.loss_cases(id) on delete cascade,
  counterparty_type          loss_counterparty_type not null,
  counterparty_name          text,
  requested_evidence_types   text[] not null default '{}',
  outbound_channel           external_correspondence_channel not null,
  recipient_or_endpoint      text,
  subject                    text,
  body_hash                  text,
  source_message_id          text,
  source_thread_id           text,
  hidden_threading_token     text not null,
  status                     external_clarification_request_status not null default 'generated',
  sent_at                    timestamptz,
  reply_received_at          timestamptz,
  created_at                 timestamptz not null default now()
);

create index if not exists idx_external_clarification_requests_case
  on public.external_clarification_requests (loss_case_id, created_at desc);
create unique index if not exists external_clarification_requests_token_unique
  on public.external_clarification_requests (merchant_id, hidden_threading_token);

create table if not exists public.correspondence_automation_settings (
  merchant_id                         uuid primary key references public.merchants(id) on delete cascade,
  auto_generate_clarification_requests boolean not null default true,
  auto_send_clarification_requests     boolean not null default false,
  auto_ingest_external_correspondence  boolean not null default true,
  auto_extract_facts_from_correspondence boolean not null default true,
  allowed_counterparty_types           text[] not null default array[
    'carrier','3pl','warehouse','payment_processor','bank','card_network',
    'marketplace','returns_provider','shipping_protection_provider','supplier',
    'customs_broker','customer','internal_team','unknown'
  ],
  allowed_outbound_channels            text[] not null default array[
    'provider_api','gmail','outlook','gorgias','zendesk','intercom','slack',
    'erp','wms','marketplace_portal_api','payment_processor_api'
  ],
  max_auto_request_value_minor         bigint,
  created_at                           timestamptz not null default now(),
  updated_at                           timestamptz not null default now()
);

drop trigger if exists trg_correspondence_automation_settings_updated on public.correspondence_automation_settings;
create trigger trg_correspondence_automation_settings_updated before update on public.correspondence_automation_settings
  for each row execute function set_updated_at();

create table if not exists public.loss_case_events (
  id                uuid primary key default gen_random_uuid(),
  merchant_id       uuid not null references public.merchants(id) on delete cascade,
  loss_case_id      uuid not null references public.loss_cases(id) on delete cascade,
  event_type        loss_case_event_type not null,
  source_provider   text,
  source_record_id  text,
  metadata_json     jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists idx_loss_case_events_case
  on public.loss_case_events (loss_case_id, created_at desc);
create index if not exists idx_loss_case_events_merchant
  on public.loss_case_events (merchant_id, created_at desc);

drop trigger if exists trg_loss_case_events_noupd on public.loss_case_events;
create trigger trg_loss_case_events_noupd before update or delete on public.loss_case_events
  for each row execute function forbid_mutation();

-- New connector categories / states for source-backed evidence and
-- correspondence. Keep legacy values readable while preventing new manual
-- upload providers from being needed.
alter table public.merchant_integrations
  drop constraint if exists merchant_integrations_category_check;
alter table public.merchant_integrations
  add constraint merchant_integrations_category_check
  check (category in (
    'commerce',
    'helpdesk',
    'tracking',
    'carrier',
    'email',
    '3pl',
    'wms',
    'returns',
    'payments',
    'chargebacks',
    'marketplace',
    'shipping_protection',
    'erp',
    'supplier',
    'internal_comms',
    'warehouse_3pl',
    'payments_disputes',
    'documents'
  ));

alter table public.merchant_integrations
  drop constraint if exists merchant_integrations_status_check;
alter table public.merchant_integrations
  add constraint merchant_integrations_status_check
  check (status in ('connected', 'not_connected', 'error', 'connection_error', 'syncing', 'disabled'));

alter table public.merchant_integrations
  drop constraint if exists merchant_integrations_auth_mode_check;
update public.merchant_integrations
  set auth_mode = 'custom'
  where auth_mode = 'manual_upload';
alter table public.merchant_integrations
  add constraint merchant_integrations_auth_mode_check
  check (auth_mode in ('oauth', 'api_key', 'webhook', 'custom'));

-- Existing enum labels cannot be removed safely, so block future use at table
-- level and remap old defaults/rows to source-backed configuration language.
update public.partner_recovery_rules
  set submission_method = 'unknown'::recovery_submission_method
  where submission_method = 'manual'::recovery_submission_method;
update public.partner_recovery_rules
  set source_type = 'merchant_configured'::recovery_rule_source_type
  where source_type = 'manual'::recovery_rule_source_type;
alter table public.partner_recovery_rules
  alter column source_type set default 'merchant_configured'::recovery_rule_source_type;
alter table public.partner_recovery_rules
  drop constraint if exists partner_recovery_rules_no_manual_submission;
alter table public.partner_recovery_rules
  add constraint partner_recovery_rules_no_manual_submission
  check (submission_method is null or submission_method <> 'manual'::recovery_submission_method);
alter table public.partner_recovery_rules
  drop constraint if exists partner_recovery_rules_no_manual_source;
alter table public.partner_recovery_rules
  add constraint partner_recovery_rules_no_manual_source
  check (source_type <> 'manual'::recovery_rule_source_type);

alter table public.loss_cases enable row level security;
alter table public.loss_case_evidence enable row level security;
alter table public.external_correspondence enable row level security;
alter table public.unmatched_correspondence enable row level security;
alter table public.external_clarification_requests enable row level security;
alter table public.correspondence_automation_settings enable row level security;
alter table public.loss_case_events enable row level security;

drop policy if exists loss_cases_member_select on public.loss_cases;
create policy loss_cases_member_select on public.loss_cases
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists loss_case_evidence_member_select on public.loss_case_evidence;
create policy loss_case_evidence_member_select on public.loss_case_evidence
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists external_correspondence_member_select on public.external_correspondence;
create policy external_correspondence_member_select on public.external_correspondence
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists unmatched_correspondence_member_select on public.unmatched_correspondence;
create policy unmatched_correspondence_member_select on public.unmatched_correspondence
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists external_clarification_requests_member_select on public.external_clarification_requests;
create policy external_clarification_requests_member_select on public.external_clarification_requests
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists correspondence_automation_settings_member_select on public.correspondence_automation_settings;
create policy correspondence_automation_settings_member_select on public.correspondence_automation_settings
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists correspondence_automation_settings_admin_write on public.correspondence_automation_settings;
create policy correspondence_automation_settings_admin_write on public.correspondence_automation_settings
  for all to authenticated
  using (merchant_role(merchant_id) in ('owner', 'admin'))
  with check (merchant_role(merchant_id) in ('owner', 'admin'));

drop policy if exists loss_case_events_member_select on public.loss_case_events;
create policy loss_case_events_member_select on public.loss_case_events
  for select to authenticated using (is_merchant_member(merchant_id));

grant all on public.loss_cases to service_role;
grant all on public.loss_case_evidence to service_role;
grant all on public.external_correspondence to service_role;
grant all on public.unmatched_correspondence to service_role;
grant all on public.external_clarification_requests to service_role;
grant all on public.correspondence_automation_settings to service_role;
grant all on public.loss_case_events to service_role;

grant select on public.loss_cases to authenticated;
grant select on public.loss_case_evidence to authenticated;
grant select on public.external_correspondence to authenticated;
grant select on public.unmatched_correspondence to authenticated;
grant select on public.external_clarification_requests to authenticated;
grant select, insert, update on public.correspondence_automation_settings to authenticated;
grant select on public.loss_case_events to authenticated;

notify pgrst, 'reload schema';

commit;
