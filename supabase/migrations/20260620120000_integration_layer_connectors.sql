begin;

create table if not exists public.merchant_integrations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  provider_id text not null,
  category text not null check (category in (
    'helpdesk',
    'commerce',
    'tracking',
    'carrier',
    'warehouse_3pl',
    'returns',
    'payments_disputes',
    'documents'
  )),
  status text not null default 'not_connected' check (status in ('connected', 'not_connected', 'error')),
  auth_mode text not null check (auth_mode in ('oauth', 'api_key', 'manual_upload')),
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, provider_id)
);

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  provider_id text not null,
  encrypted_payload text not null,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, provider_id)
);

create table if not exists public.integration_evidence_items (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid references public.support_payout_cases(id) on delete cascade,
  source_provider text not null,
  source_category text not null check (source_category in (
    'helpdesk',
    'commerce',
    'tracking',
    'carrier',
    'warehouse_3pl',
    'returns',
    'payments_disputes',
    'documents'
  )),
  evidence_type text not null check (evidence_type in (
    'ticket_messages',
    'ticket_attachments',
    'customer_claim_reason',
    'requested_action',
    'order_value',
    'line_items',
    'customer_history',
    'refund_history',
    'reship_history',
    'tracking_number',
    'tracking_events',
    'delivery_status',
    'delivery_photo',
    'signature',
    'dispute_status',
    'chargeback_evidence',
    'contract_terms',
    'recovery_deadline',
    'return_request_status',
    'return_inspection_outcome',
    'warehouse_pick_pack',
    'warehouse_exception',
    'three_pl_sla_claim_status',
    'carrier_claim_submission_status',
    'carrier_claim_outcome',
    'recovery_amount_approved',
    'recovery_amount_paid',
    'self_reported_pack_confirmation',
    'self_reported_pack_photo'
  )),
  title text not null,
  summary text not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  value jsonb,
  occurred_at timestamptz,
  raw_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_documents (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  document_type text not null check (document_type in (
    'carrier_agreement',
    'three_pl_sla',
    'supplier_terms',
    'insurance_policy'
  )),
  file_path text not null,
  extraction_status text not null default 'uploaded' check (extraction_status in (
    'uploaded',
    'needs_merchant_approval',
    'approved',
    'rejected',
    'failed'
  )),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extracted_partner_terms (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  document_id uuid not null references public.integration_documents(id) on delete cascade,
  partner_type text not null check (partner_type in ('carrier', 'three_pl', 'supplier', 'insurer')),
  covered_loss_types text[] not null default '{}',
  exclusions text[] not null default '{}',
  claim_deadline_days integer check (claim_deadline_days is null or claim_deadline_days >= 0),
  required_evidence text[] not null default '{}',
  max_recoverable_amount numeric(12,2),
  deductible_amount numeric(12,2),
  claim_submission_method text,
  escalation_contact text,
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, document_id)
);

create table if not exists public.category_applicability (
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  category text not null check (category in ('warehouse_3pl', 'returns')),
  status text not null check (status in ('applicable', 'not_applicable')),
  set_by uuid references auth.users(id) on delete set null,
  set_at timestamptz not null default now(),
  primary key (merchant_id, category)
);

create table if not exists public.pack_confirmations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  order_id text not null,
  fulfillment_id text not null,
  confirmed_by text,
  item_match_confirmed boolean not null default false,
  photo_url text,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (merchant_id, order_id, fulfillment_id)
);

create index if not exists merchant_integrations_merchant_idx
  on public.merchant_integrations(merchant_id, provider_id);
create index if not exists integration_credentials_merchant_idx
  on public.integration_credentials(merchant_id, provider_id);
create index if not exists integration_evidence_items_case_idx
  on public.integration_evidence_items(merchant_id, support_payout_case_id);
create index if not exists integration_evidence_items_reference_idx
  on public.integration_evidence_items(merchant_id, raw_reference);
create index if not exists integration_documents_merchant_idx
  on public.integration_documents(merchant_id, document_type);
create index if not exists extracted_partner_terms_merchant_idx
  on public.extracted_partner_terms(merchant_id, partner_type);
create index if not exists category_applicability_merchant_idx
  on public.category_applicability(merchant_id, category);
create index if not exists pack_confirmations_order_idx
  on public.pack_confirmations(merchant_id, order_id, fulfillment_id);

drop trigger if exists trg_merchant_integrations_updated on public.merchant_integrations;
create trigger trg_merchant_integrations_updated before update on public.merchant_integrations
  for each row execute function set_updated_at();

drop trigger if exists trg_integration_credentials_updated on public.integration_credentials;
create trigger trg_integration_credentials_updated before update on public.integration_credentials
  for each row execute function set_updated_at();

drop trigger if exists trg_integration_documents_updated on public.integration_documents;
create trigger trg_integration_documents_updated before update on public.integration_documents
  for each row execute function set_updated_at();

drop trigger if exists trg_extracted_partner_terms_updated on public.extracted_partner_terms;
create trigger trg_extracted_partner_terms_updated before update on public.extracted_partner_terms
  for each row execute function set_updated_at();

alter table public.merchant_integrations enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.integration_evidence_items enable row level security;
alter table public.integration_documents enable row level security;
alter table public.extracted_partner_terms enable row level security;
alter table public.category_applicability enable row level security;
alter table public.pack_confirmations enable row level security;

drop policy if exists merchant_integrations_member_select on public.merchant_integrations;
create policy merchant_integrations_member_select on public.merchant_integrations
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists merchant_integrations_admin_write on public.merchant_integrations;
create policy merchant_integrations_admin_write on public.merchant_integrations
  for all to authenticated
  using (merchant_role(merchant_id) in ('owner', 'admin'))
  with check (merchant_role(merchant_id) in ('owner', 'admin'));

drop policy if exists integration_credentials_no_client_select on public.integration_credentials;
create policy integration_credentials_no_client_select on public.integration_credentials
  for select to authenticated using (false);

drop policy if exists integration_credentials_admin_write on public.integration_credentials;
create policy integration_credentials_admin_write on public.integration_credentials
  for all to authenticated
  using (merchant_role(merchant_id) in ('owner', 'admin'))
  with check (merchant_role(merchant_id) in ('owner', 'admin'));

drop policy if exists integration_evidence_items_member_select on public.integration_evidence_items;
create policy integration_evidence_items_member_select on public.integration_evidence_items
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists integration_evidence_items_admin_write on public.integration_evidence_items;
create policy integration_evidence_items_admin_write on public.integration_evidence_items
  for all to authenticated
  using (merchant_role(merchant_id) in ('owner', 'admin'))
  with check (merchant_role(merchant_id) in ('owner', 'admin'));

drop policy if exists integration_documents_member_select on public.integration_documents;
create policy integration_documents_member_select on public.integration_documents
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists integration_documents_admin_write on public.integration_documents;
create policy integration_documents_admin_write on public.integration_documents
  for all to authenticated
  using (merchant_role(merchant_id) in ('owner', 'admin'))
  with check (merchant_role(merchant_id) in ('owner', 'admin'));

drop policy if exists extracted_partner_terms_member_select on public.extracted_partner_terms;
create policy extracted_partner_terms_member_select on public.extracted_partner_terms
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists extracted_partner_terms_admin_write on public.extracted_partner_terms;
create policy extracted_partner_terms_admin_write on public.extracted_partner_terms
  for all to authenticated
  using (merchant_role(merchant_id) in ('owner', 'admin'))
  with check (merchant_role(merchant_id) in ('owner', 'admin'));

drop policy if exists category_applicability_member_select on public.category_applicability;
create policy category_applicability_member_select on public.category_applicability
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists category_applicability_admin_write on public.category_applicability;
create policy category_applicability_admin_write on public.category_applicability
  for all to authenticated
  using (merchant_role(merchant_id) in ('owner', 'admin'))
  with check (merchant_role(merchant_id) in ('owner', 'admin'));

drop policy if exists pack_confirmations_member_select on public.pack_confirmations;
create policy pack_confirmations_member_select on public.pack_confirmations
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists pack_confirmations_admin_write on public.pack_confirmations;
create policy pack_confirmations_admin_write on public.pack_confirmations
  for all to authenticated
  using (merchant_role(merchant_id) in ('owner', 'admin'))
  with check (merchant_role(merchant_id) in ('owner', 'admin'));

grant all on public.merchant_integrations to service_role;
grant all on public.integration_credentials to service_role;
grant all on public.integration_evidence_items to service_role;
grant all on public.integration_documents to service_role;
grant all on public.extracted_partner_terms to service_role;
grant all on public.category_applicability to service_role;
grant all on public.pack_confirmations to service_role;
grant select, insert, update, delete on public.merchant_integrations to authenticated;
grant select on public.integration_evidence_items to authenticated;
grant select, insert, update, delete on public.integration_documents to authenticated;
grant select, insert, update, delete on public.extracted_partner_terms to authenticated;
grant select, insert, update, delete on public.category_applicability to authenticated;
grant select on public.pack_confirmations to authenticated;

insert into storage.buckets (id, name, public)
values ('integration-documents', 'integration-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('pack-confirmation-photos', 'pack-confirmation-photos', false)
on conflict (id) do nothing;

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
