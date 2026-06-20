-- ============================================================================
-- UNAUTH — REBUILT SCHEMA v2
-- Purpose-built to ingest, normalise, resolve, and serve unified
-- cross-merchant identity profiles from light commerce + helpdesk integrations.
--
-- Layers (top to bottom):
--   0. Tenancy & access        — merchants, members, connections, keys
--   1. Raw ingestion           — per-platform normalized records (merchant-owned,
--                                plaintext allowed, RLS merchant-scoped)
--   2. Identity signal layer   — atomic hashed identifier observations
--                                (network-level, HMAC-hashed, service-role only)
--   3. Resolution layer        — identities (cluster heads), memberships, edges,
--                                resolution event log
--   4. Behaviour layer         — claims, outcomes, evidence (linkable to identity,
--                                never part of the identity graph itself)
--   5. Serving layer           — per-identity rollups + k-anonymous RPCs
--   6. Ops                     — webhook idempotency, sync jobs, billing (kept)
--
-- PII policy (single rule, enforced structurally):
--   * Plaintext PII lives ONLY in layer-1 tables, scoped to the merchant who
--     legally owns that data. RLS confines it to that merchant.
--   * Everything network-level (layers 2,3,5) stores HMAC-SHA256 hashes only
--     (peppered with INTERNAL_HMAC_SECRET, computed in lib/identity/hash.ts).
--   * Cross-merchant reads go through SECURITY DEFINER RPCs that enforce
--     k-anonymity (distinct merchants >= K_ANONYMITY_MIN = 3).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS (real enums; the old schema used text+CHECK with 3 incompatible
-- grade vocabularies — one canonical vocabulary per concept now)
-- ----------------------------------------------------------------------------
create type platform_kind        as enum ('shopify','woocommerce','bigcommerce');
create type helpdesk_kind        as enum ('gorgias','zendesk','freshdesk');
create type connection_status    as enum ('active','disabled','revoked','error');
create type member_role          as enum ('owner','admin','analyst','viewer');
create type invite_status        as enum ('pending','active','revoked');

-- Canonical identifier vocabulary. Matches what the light integrations can
-- actually populate (see addendum): NO device fingerprint, NO session ids.
create type identifier_type as enum (
  'email',                -- normalized (lowercase, gmail dots/plus stripped) then HMAC
  'email_root',           -- derived: local-part root + domain (catches plus/dot rotation)
  'phone',                -- E.164 normalized then HMAC
  'shipping_address',     -- aggressively normalized full address then HMAC
  'billing_address',
  'address_unit',         -- normalized line1+unit only (catches city/zip typos)
  'ip',                   -- order browser_ip / customer_ip_address
  'name',                 -- normalized full name (weak; combination-only)
  'payment_fingerprint',  -- gateway + card_last4 composite (best available without embed)
  'platform_customer_id', -- e.g. shopify customer id (raw, not PII)
  'helpdesk_contact_id'   -- e.g. gorgias contact id (raw)
);

create type signal_source as enum (
  'shopify','woocommerce','bigcommerce','gorgias','zendesk','freshdesk',
  'csv','manual'
);

-- ONE grade scale. Thresholds live in lib/engine/weights.ts
-- (CONFIDENCE_THRESHOLDS: DEFINITE 85 / PROBABLE 65 / POSSIBLE 45).
create type confidence_grade as enum ('weak','possible','probable','definite');

create type order_financial_status as enum (
  'pending','authorized','paid','partially_paid','partially_refunded',
  'refunded','voided','cancelled','unknown'
);
create type fulfillment_state as enum (
  'unfulfilled','partial','fulfilled','delivered','in_transit',
  'failure','returned','unknown'
);

create type claim_type as enum (
  'item_not_received','damaged','wrong_item','not_as_described',
  'refund_request','chargeback','return_abuse','other'
);
create type claim_status as enum (
  'new','evidence_needed','awaiting_customer_evidence',
  'awaiting_carrier_response','awaiting_3pl_response',
  'awaiting_supplier_response','ready_for_decision','manual_review',
  'decision_recorded','recovery_opened','closed',
  'pending','open','escalated',
  'resolved_refunded','resolved_won','resolved_lost','resolved_denied',
  'resolved_exchanged','voided','stale'
);
create type claim_decision as enum (
  'approved','denied','escalated','partial_refund','full_refund',
  'chargeback_disputed','no_action'
);
create type claim_outcome as enum (
  'loss','recovered','pending','chargeback_won','chargeback_lost',
  'customer_verified','suspected_fraud','legitimate'
);
create type claim_detection_method as enum (
  'tag','keyword','manual','platform_dispute','platform_refund','model'
);

-- Support payout case: requested action + advisory loss attribution + recovery.
-- Neutral, non-accusatory vocabularies (must match lib/payouts/types.ts).
create type requested_action as enum (
  'refund','reship','replacement','discount','store_credit',
  'return_label','investigation','escalation','unknown'
);
create type loss_attribution as enum (
  'customer_claim','carrier_loss','carrier_damage','failed_delivery_evidence',
  'warehouse_mispick','warehouse_missing_item','three_pl_late_dispatch',
  'supplier_defect','packaging_failure','merchant_policy','unknown'
);
create type attribution_confidence as enum (
  'high','medium','low','needs_more_evidence'
);
create type recoverability as enum (
  'recoverable','possibly_recoverable','not_recoverable','needs_more_evidence','unknown'
);
create type recovery_owner as enum (
  'carrier','three_pl','warehouse','supplier','merchant','unknown'
);

create type partner_type as enum (
  'carrier','three_pl','warehouse','supplier','returns_provider',
  'payment_dispute_provider','internal_team','other'
);
create type partner_status as enum ('active','inactive');
create type recovery_case_type as enum (
  'carrier_claim','three_pl_claim','warehouse_error','supplier_defect',
  'packaging_issue','returns_provider_claim','chargeback_evidence',
  'internal_policy_fix','other'
);
create type recovery_rule_claim_type as enum (
  'item_not_received','damaged_item','wrong_item','missing_item',
  'late_delivery','returnless_refund','discount_request','store_credit_request',
  'chargeback_related','replacement_request','other'
);
create type recovery_liability_cap_basis as enum (
  'fixed','declared_value','insured_value','contractual','unknown'
);
create type recovery_submission_method as enum ('portal','email','api','manual','unknown');
create type recovery_rule_source_type as enum (
  'unauth_default','merchant_configured','contract_extracted','manual'
);
create type recovery_confidence as enum ('high','medium','low');
create type recovery_case_owner_type as enum (
  'carrier','three_pl','warehouse','supplier','returns_provider',
  'payment_dispute_provider','merchant_support','merchant_ops',
  'merchant_finance','unknown'
);
create type recovery_case_status as enum (
  'draft','evidence_needed','ready_to_submit','submitted','waiting_response',
  'chase_due','approved','partially_approved','rejected','appealed','paid',
  'closed_unrecoverable'
);
create type recovery_case_event_type as enum (
  'created','status_changed','evidence_added','submitted','chased','approved',
  'partially_approved','rejected','appealed','paid','closed'
);

create type ticket_channel as enum (
  'email','chat','sms','phone','social','portal','api','bot','unknown'
);

create type sync_job_status as enum ('pending','running','completed','failed');

-- ----------------------------------------------------------------------------
-- COMMON: updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name;
end $$;

-- ============================================================================
-- LAYER 0 — TENANCY & ACCESS
-- ============================================================================

create table merchants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  is_demo       boolean not null default false,
  is_internal   boolean not null default false,
  settings      jsonb not null default '{}'::jsonb,   -- column maps, onboarding flags
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_merchants_updated before update on merchants
  for each row execute function set_updated_at();

-- Membership IS the ownership model. No merchants.user_id, no UNIQUE(user_id)
-- (old schema capped one merchant per auth user while also having a team table).
create table merchant_users (
  id             uuid primary key default gen_random_uuid(),
  merchant_id    uuid not null references merchants(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  invited_email  text not null,
  role           member_role not null default 'analyst',
  invite_status  invite_status not null default 'pending',
  invited_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  accepted_at    timestamptz,
  unique (merchant_id, invited_email)
);
create index idx_merchant_users_user on merchant_users(user_id) where invite_status = 'active';

-- RLS helper: every merchant-scoped policy uses ONE membership predicate.
-- (The old schema had two competing tenancy conventions — auth.uid()=merchant_id
-- vs merchants.user_id — and re-fixed the same bug in 6 separate migrations.)
create or replace function is_merchant_member(p_merchant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from merchant_users mu
    where mu.merchant_id = p_merchant_id
      and mu.user_id = auth.uid()
      and mu.invite_status = 'active'
  );
$$;

alter table merchants enable row level security;
alter table merchant_users enable row level security;

create policy merchants_member_select on merchants
  for select to authenticated using (is_merchant_member(id));
-- role helper must be SECURITY DEFINER: inline self-referencing subqueries on
-- merchant_users recurse infinitely through their own RLS policy.
create or replace function merchant_role(p_merchant_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select role::text from merchant_users
  where merchant_id = p_merchant_id and user_id = auth.uid() and invite_status = 'active'
  limit 1;
$$;
create policy merchants_owner_update on merchants
  for update to authenticated using (merchant_role(id) in ('owner','admin'));
create policy merchant_users_member_select on merchant_users
  for select to authenticated using (is_merchant_member(merchant_id));
create policy merchant_users_owner_write on merchant_users
  for all to authenticated using (merchant_role(merchant_id) = 'owner');

-- ONE connection model for all commerce platforms (replaces the three-way
-- shopify_merchants / merchant_shopify_connections / commerce_store_connections
-- split). Credentials are ALWAYS encrypted — no plaintext OAuth tokens.
create table store_connections (
  id                    uuid primary key default gen_random_uuid(),
  merchant_id           uuid not null references merchants(id) on delete restrict,
  platform              platform_kind not null,
  store_key             text not null,      -- shop_domain / store url host / store hash
  store_url             text,
  status                connection_status not null default 'active',
  credentials_encrypted text not null,
  scopes                jsonb not null default '[]'::jsonb,
  installed_at          timestamptz not null default now(),
  uninstalled_at        timestamptz,
  last_sync_at          timestamptz,
  last_error            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (platform, store_key)
);
create index idx_store_connections_merchant on store_connections(merchant_id, platform);
create trigger trg_store_connections_updated before update on store_connections
  for each row execute function set_updated_at();

create table helpdesk_connections (
  id                       uuid primary key default gen_random_uuid(),
  merchant_id              uuid not null references merchants(id) on delete restrict,
  provider                 helpdesk_kind not null,
  provider_account_id      text,
  provider_account_name    text,
  provider_base_url        text,
  status                   connection_status not null default 'active',
  access_token_encrypted   text,
  refresh_token_encrypted  text,
  token_expires_at         timestamptz,
  scopes                   jsonb not null default '[]'::jsonb,
  webhook_secret_hash      text,
  webhook_secret_rotated_at timestamptz,
  last_sync_at             timestamptz,
  last_error               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (merchant_id, provider, provider_account_id)
);
create index idx_helpdesk_connections_merchant on helpdesk_connections(merchant_id, provider);
create trigger trg_helpdesk_connections_updated before update on helpdesk_connections
  for each row execute function set_updated_at();

alter table store_connections enable row level security;
alter table helpdesk_connections enable row level security;
create policy store_connections_member_select on store_connections
  for select to authenticated using (is_merchant_member(merchant_id));
create policy helpdesk_connections_member_select on helpdesk_connections
  for select to authenticated using (is_merchant_member(merchant_id));
-- writes are server-side only (service_role bypasses RLS); token columns are
-- excluded client-side via a column-limited view if ever needed.

create table merchant_api_keys (
  id                    uuid primary key default gen_random_uuid(),
  merchant_id           uuid not null references merchants(id) on delete cascade,
  key_hash              text not null unique,
  key_prefix            text not null,
  name                  text,
  rate_limit_per_minute integer not null default 60,
  created_at            timestamptz not null default now(),
  last_used_at          timestamptz,
  revoked_at            timestamptz
);
create index idx_api_keys_active on merchant_api_keys(key_hash) where revoked_at is null;
alter table merchant_api_keys enable row level security;
create policy api_keys_member_select on merchant_api_keys
  for select to authenticated using (is_merchant_member(merchant_id));

-- ============================================================================
-- LAYER 1 — RAW INGESTION (merchant-owned, plaintext allowed, RLS-scoped)
-- One platform-agnostic shape per concept. Adapters normalise INTO these;
-- adding Freshdesk/BigCommerce/etc never changes structure.
-- ============================================================================

-- Customer records as the platform sees them (Shopify customer, Woo customer,
-- BigCommerce customer, Gorgias contact, Zendesk requester, Freshdesk contact).
create table source_customers (
  id                uuid primary key default gen_random_uuid(),
  merchant_id       uuid not null references merchants(id) on delete cascade,
  source            signal_source not null,
  connection_id     uuid,                      -- store_connections.id or helpdesk_connections.id
  external_id       text not null,             -- platform customer/contact id
  email             text,
  phone             text,
  first_name        text,
  last_name         text,
  verified_email    boolean,
  account_created_at timestamptz,
  orders_count      integer,
  total_spent       numeric(12,2),
  tags              jsonb not null default '[]'::jsonb,
  note              text,
  -- the hard link: Gorgias contact.external_id -> Shopify customer id, etc.
  linked_platform_customer_external_id text,
  other_emails      jsonb not null default '[]'::jsonb,  -- Freshdesk other_emails etc.
  raw_metadata      jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (merchant_id, source, external_id)
);
create index idx_source_customers_email on source_customers(merchant_id, lower(email));
create index idx_source_customers_link on source_customers(merchant_id, linked_platform_customer_external_id)
  where linked_platform_customer_external_id is not null;
create trigger trg_source_customers_updated before update on source_customers
  for each row execute function set_updated_at();

-- Addresses stored ATOMICALLY (constraint #4: never one string).
create table source_addresses (
  id                 uuid primary key default gen_random_uuid(),
  merchant_id        uuid not null references merchants(id) on delete cascade,
  source_customer_id uuid references source_customers(id) on delete cascade,
  kind               text not null check (kind in ('shipping','billing','saved')),
  line1              text,
  line2              text,
  city               text,
  region             text,           -- province/state
  postal_code        text,           -- normalized: zip5 (zip+4 truncated)
  country            text,           -- ISO-3166 alpha-2
  phone              text,
  normalized_full    text,           -- output of normaliseAddress() — match key input
  created_at         timestamptz not null default now()
);
create index idx_source_addresses_customer on source_addresses(source_customer_id);
create index idx_source_addresses_norm on source_addresses(merchant_id, normalized_full);

-- Orders: only fields the Admin/REST APIs actually return (addendum-faithful).
create table source_orders (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references merchants(id) on delete cascade,
  source              signal_source not null,
  connection_id       uuid references store_connections(id) on delete set null,
  external_id         text not null,           -- platform order id
  order_number        text,
  source_customer_id  uuid references source_customers(id) on delete set null,
  email               text,
  phone               text,
  financial_status    order_financial_status not null default 'unknown',
  fulfillment_state   fulfillment_state not null default 'unknown',
  total_price         numeric(12,2),
  subtotal_price      numeric(12,2),
  total_discounts     numeric(12,2),
  currency            text,
  discount_codes      jsonb not null default '[]'::jsonb,
  payment_gateway     text,
  card_last4          text,
  browser_ip          inet,                    -- Shopify browser_ip / Woo customer_ip_address / BC ip_address
  user_agent          text,
  accept_language     text,
  landing_site        text,
  referring_site      text,
  source_name         text,                    -- web/pos/draft etc.
  shipping_address_id uuid references source_addresses(id) on delete set null,
  billing_address_id  uuid references source_addresses(id) on delete set null,
  line_items_count    integer,
  note                text,
  tags                jsonb not null default '[]'::jsonb,
  placed_at           timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,
  raw_payload_hash    text,
  ingested_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (merchant_id, source, external_id)
);
create index idx_source_orders_customer on source_orders(source_customer_id);
create index idx_source_orders_email on source_orders(merchant_id, lower(email));
create index idx_source_orders_placed on source_orders(merchant_id, placed_at desc);
create index idx_source_orders_ip on source_orders(browser_ip) where browser_ip is not null;
create trigger trg_source_orders_updated before update on source_orders
  for each row execute function set_updated_at();

create table source_refunds (
  id               uuid primary key default gen_random_uuid(),
  merchant_id      uuid not null references merchants(id) on delete cascade,
  source_order_id  uuid not null references source_orders(id) on delete cascade,
  external_id      text not null,
  amount           numeric(12,2),
  currency         text,
  reason           text,
  is_full_refund   boolean,
  refunded_at      timestamptz,
  raw_payload_hash text,
  ingested_at      timestamptz not null default now(),
  unique (merchant_id, source_order_id, external_id)
);
create index idx_source_refunds_order on source_refunds(source_order_id);

create table source_fulfillments (
  id               uuid primary key default gen_random_uuid(),
  merchant_id      uuid not null references merchants(id) on delete cascade,
  source_order_id  uuid not null references source_orders(id) on delete cascade,
  external_id      text not null,
  status           text,
  shipment_status  text,
  tracking_company text,
  tracking_number  text,           -- plaintext: merchant-owned, needed for evidence packs
  occurred_at      timestamptz,
  updated_at_source timestamptz,
  ingested_at      timestamptz not null default now(),
  unique (merchant_id, source_order_id, external_id)
);
create index idx_source_fulfillments_order on source_fulfillments(source_order_id);

create table source_disputes (
  id               uuid primary key default gen_random_uuid(),
  merchant_id      uuid not null references merchants(id) on delete cascade,
  source_order_id  uuid references source_orders(id) on delete set null,
  external_id      text not null,
  dispute_type     text,           -- chargeback / inquiry
  reason           text,
  amount           numeric(12,2),
  currency         text,
  status           text,
  initiated_at     timestamptz,
  finalized_at     timestamptz,
  ingested_at      timestamptz not null default now(),
  unique (merchant_id, external_id)
);

-- Helpdesk tickets (Gorgias ticket / Zendesk ticket / Freshdesk ticket).
create table source_tickets (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references merchants(id) on delete cascade,
  provider            helpdesk_kind not null,
  connection_id       uuid references helpdesk_connections(id) on delete set null,
  external_id         text not null,
  external_url        text,
  source_customer_id  uuid references source_customers(id) on delete set null,
  subject             text,
  status              text,                     -- provider-native, mapped in adapter
  channel             ticket_channel not null default 'unknown',
  tags                jsonb not null default '[]'::jsonb,
  is_spam             boolean,
  satisfaction_score  numeric,
  message_count       integer,
  customer_reply_count integer,
  was_reopened        boolean,
  linked_order_external_ids jsonb not null default '[]'::jsonb,  -- Gorgias linked orders etc.
  opened_at_provider  timestamptz,
  closed_at_provider  timestamptz,
  created_at_provider timestamptz,
  updated_at_provider timestamptz,
  raw_payload_hash    text,
  ingested_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (merchant_id, provider, external_id)
);
create index idx_source_tickets_customer on source_tickets(source_customer_id);
create index idx_source_tickets_merchant on source_tickets(merchant_id, created_at_provider desc);
create trigger trg_source_tickets_updated before update on source_tickets
  for each row execute function set_updated_at();

-- Ticket message/event stream — summaries + extracted identifiers, not raw bodies.
create table source_ticket_events (
  id                uuid primary key default gen_random_uuid(),
  merchant_id       uuid not null references merchants(id) on delete cascade,
  source_ticket_id  uuid not null references source_tickets(id) on delete cascade,
  event_type        text not null,    -- message_created / ticket_tagged / status_changed / ...
  actor_type        text,             -- customer / agent / system
  summary           text,
  extracted_identifiers jsonb not null default '{}'::jsonb, -- {emails:[], order_refs:[], phones:[]}
  occurred_at       timestamptz,
  metadata          jsonb not null default '{}'::jsonb,
  raw_payload_hash  text,
  created_at        timestamptz not null default now()
);
create index idx_ticket_events_ticket on source_ticket_events(source_ticket_id, occurred_at);

-- Merchant-scoped RLS for ALL layer-1 tables (read-only to members; all
-- ingestion writes go through service_role).
do $$
declare t text;
begin
  foreach t in array array[
    'source_customers','source_addresses','source_orders','source_refunds',
    'source_fulfillments','source_disputes','source_tickets','source_ticket_events'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I_member_select on %I for select to authenticated using (is_merchant_member(merchant_id))',
      t, t);
  end loop;
end $$;

-- ============================================================================
-- LAYER 2 — IDENTITY SIGNAL LAYER (network-level, hashed, service-role only)
-- One observation per (identifier, merchant, source entity). This is the ONLY
-- input to resolution. New integrations only need to emit these rows.
-- ============================================================================

create table identity_signals (
  id               uuid primary key default gen_random_uuid(),
  merchant_id      uuid not null references merchants(id) on delete cascade,
  identifier_type  identifier_type not null,
  identifier_hash  text not null,            -- HMAC-SHA256 hex (64 chars) for PII types;
                                             -- raw platform ids allowed for *_id types
  source           signal_source not null,
  -- provenance back into layer 1 (exactly one set per signal):
  source_order_id    uuid references source_orders(id) on delete cascade,
  source_customer_id uuid references source_customers(id) on delete cascade,
  source_ticket_id   uuid references source_tickets(id) on delete cascade,
  observed_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  constraint identity_signals_hash_format check (
    identifier_type in ('platform_customer_id','helpdesk_contact_id')
    or identifier_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint identity_signals_one_provenance check (
    (source_order_id is not null)::int +
    (source_customer_id is not null)::int +
    (source_ticket_id is not null)::int = 1
  )
);
-- dedupe: same identifier from the same source entity is one observation
create unique index ux_identity_signals_dedupe on identity_signals
  (identifier_type, identifier_hash, merchant_id,
   coalesce(source_order_id,'00000000-0000-0000-0000-000000000000'::uuid),
   coalesce(source_customer_id,'00000000-0000-0000-0000-000000000000'::uuid),
   coalesce(source_ticket_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index idx_identity_signals_lookup on identity_signals(identifier_type, identifier_hash);
create index idx_identity_signals_merchant on identity_signals(merchant_id, observed_at desc);

-- Pairwise co-occurrence graph: two identifiers seen on the same source entity.
-- Canonical ordering prevents mirror duplicates (kept from new-gen design —
-- it was the one good idea in the old graph).
create table identity_edges (
  id               uuid primary key default gen_random_uuid(),
  merchant_id      uuid not null references merchants(id) on delete cascade,
  left_type        identifier_type not null,
  left_hash        text not null,
  right_type       identifier_type not null,
  right_hash       text not null,
  seen_count       integer not null default 1 check (seen_count >= 1),
  source           signal_source not null,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  constraint identity_edges_canonical check (
    (left_type::text, left_hash) < (right_type::text, right_hash)
  ),
  unique (merchant_id, left_type, left_hash, right_type, right_hash)
);
create index idx_identity_edges_left  on identity_edges(left_type, left_hash);
create index idx_identity_edges_right on identity_edges(right_type, right_hash);

-- ============================================================================
-- LAYER 3 — RESOLUTION (cluster heads + memberships + audit trail)
-- ============================================================================

create table identities (
  id                 uuid primary key default gen_random_uuid(),
  confidence_grade   confidence_grade not null default 'weak',
  confidence_score   numeric(5,2) not null default 0 check (confidence_score between 0 and 100),
  merchant_count     integer not null default 0,    -- distinct merchants; k-anon input
  signal_count       integer not null default 0,
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  superseded_by      uuid references identities(id) on delete set null,  -- merge lineage
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_identities_grade on identities(confidence_grade, last_seen_at desc);
create trigger trg_identities_updated before update on identities
  for each row execute function set_updated_at();

-- identifier -> identity membership, with per-membership confidence.
create table identity_members (
  identity_id      uuid not null references identities(id) on delete cascade,
  identifier_type  identifier_type not null,
  identifier_hash  text not null,
  match_confidence numeric(5,2) not null check (match_confidence between 0 and 100),
  matched_via      jsonb not null default '[]'::jsonb,  -- signal names that justified inclusion
  added_at         timestamptz not null default now(),
  primary key (identity_id, identifier_type, identifier_hash)
);
-- One identifier belongs to at most one live identity — but ONLY for strong
-- identifier types. 'name' and 'ip' are shared across thousands of people;
-- they stay in identity_signals/identity_edges as bridging signals that
-- contribute edge weight without claiming exclusive identity membership.
create unique index ux_identity_members_strong_identifier
  on identity_members(identifier_type, identifier_hash)
  where identifier_type in (
    'email','email_root','phone',
    'shipping_address','billing_address','address_unit',
    'payment_fingerprint','platform_customer_id','helpdesk_contact_id'
  );
create index idx_identity_members_identifier
  on identity_members(identifier_type, identifier_hash);

-- Append-only resolution audit: every merge, split, grade change, FP report.
create table identity_resolution_events (
  id            uuid primary key default gen_random_uuid(),
  identity_id   uuid not null references identities(id) on delete cascade,
  event_type    text not null check (event_type in
    ('created','member_added','member_removed','merged','split',
     'grade_changed','false_positive_reported','false_positive_confirmed')),
  from_grade    confidence_grade,
  to_grade      confidence_grade,
  detail        jsonb not null default '{}'::jsonb,
  actor         text not null default 'engine',   -- engine | merchant:<uuid> | admin
  created_at    timestamptz not null default now()
);
create index idx_resolution_events_identity on identity_resolution_events(identity_id, created_at desc);
create trigger trg_resolution_events_noupd before update or delete on identity_resolution_events
  for each row execute function forbid_mutation();

-- ============================================================================
-- LAYER 4 — BEHAVIOUR (claims: linkable to identity, not part of the graph)
-- ============================================================================

-- Renamed from `claims` (2026-06-19): support payout cases. Child FK columns
-- intentionally retain claim_id naming; FK constraint names stay claims_* too.
create table support_payout_cases (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references merchants(id) on delete cascade,
  source_ticket_id    uuid references source_tickets(id) on delete set null,
  source_order_id     uuid references source_orders(id) on delete set null,
  identity_id         uuid references identities(id) on delete set null,  -- the link, set by resolver
  claim_type          claim_type not null,
  status              claim_status not null default 'pending',
  detection_method    claim_detection_method not null default 'keyword',
  detection_detail    jsonb not null default '{}'::jsonb,  -- trigger tags, confidence
  reason_raw          text,
  reason_normalized   text,
  amount_at_risk      numeric(12,2),
  currency            text,
  requires_review     boolean not null default false,
  -- payout exposure (amounts share the `currency` column above)
  refund_amount              numeric(12,2),
  replacement_item_value     numeric(12,2),
  replacement_shipping_cost  numeric(12,2),
  discount_amount            numeric(12,2),
  store_credit_amount        numeric(12,2),
  estimated_support_cost     numeric(12,2),
  total_estimated_loss       numeric(12,2),
  requested_action           requested_action not null default 'unknown',
  -- advisory loss attribution + lightweight recovery path
  loss_attribution           loss_attribution,
  attribution_confidence     attribution_confidence,
  recoverability             recoverability,
  recovery_owner             recovery_owner,
  recovery_required_evidence text[] not null default '{}',
  recovery_next_action       text,
  -- steering recommendation at last evaluation
  recommended_payout_action  text,
  recommended_rule_name      text,
  recommended_rule_id        uuid,
  payout_decision_state      text not null default 'undecided',
  recovery_state             text not null default 'no_recovery_needed',
  next_action                text,
  next_action_reason         text,
  -- ops state
  assigned_to         uuid references auth.users(id) on delete set null,
  assigned_at         timestamptz,
  snoozed_until       timestamptz,
  first_viewed_at     timestamptz,
  submitted_at        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint claims_anchor_required check (
    source_ticket_id is not null or source_order_id is not null
  )
);
-- NOT unique: live data shows one order legitimately accrues multiple claims
-- over time (e.g. damaged-item claim followed by a chargeback) — 323 such
-- pairs existed at migration time. Claim-per-order dedupe is an app concern.
create index idx_support_payout_cases_order on support_payout_cases(merchant_id, source_order_id)
  where source_order_id is not null;
create index idx_support_payout_cases_merchant_status on support_payout_cases(merchant_id, status);
create index idx_support_payout_cases_identity on support_payout_cases(identity_id) where identity_id is not null;
create index idx_support_payout_cases_requested_action on support_payout_cases(merchant_id, requested_action);
create index idx_support_payout_cases_loss_attribution on support_payout_cases(merchant_id, loss_attribution)
  where loss_attribution is not null;
create index idx_support_payout_cases_recoverability on support_payout_cases(merchant_id, recoverability)
  where recoverability is not null;
create index idx_support_payout_cases_next_action on support_payout_cases(merchant_id, next_action)
  where next_action is not null;
create index idx_support_payout_cases_payout_decision_state on support_payout_cases(merchant_id, payout_decision_state);
create index idx_support_payout_cases_recovery_state on support_payout_cases(merchant_id, recovery_state);
create trigger trg_support_payout_cases_updated before update on support_payout_cases
  for each row execute function set_updated_at();

create table claim_events (
  id            uuid primary key default gen_random_uuid(),
  claim_id      uuid not null references support_payout_cases(id) on delete cascade,
  merchant_id   uuid not null references merchants(id) on delete cascade,
  event_type    text not null,
  from_status   claim_status,
  to_status     claim_status,
  note          text,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index idx_claim_events_claim on claim_events(claim_id, created_at desc);
create trigger trg_claim_events_noupd before update or delete on claim_events
  for each row execute function forbid_mutation();

create table claim_outcomes (
  id               uuid primary key default gen_random_uuid(),
  claim_id         uuid not null references support_payout_cases(id) on delete cascade unique,
  decision         claim_decision not null,
  outcome          claim_outcome not null default 'pending',
  amount_refunded  numeric(12,2),
  amount_recovered numeric(12,2),
  notes            text,
  recommended_payout_action text,
  followed_recommendation   boolean,
  decided_by       uuid references auth.users(id) on delete set null,
  decided_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_claim_outcomes_updated before update on claim_outcomes
  for each row execute function set_updated_at();

create table case_clarification_requests (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  support_payout_case_id uuid not null references support_payout_cases(id) on delete cascade,
  target_type text not null check (target_type in ('carrier','3pl','supplier','customer','internal')),
  target_name text,
  status text not null default 'draft' check (status in ('draft','sent','waiting_response','response_received','closed')),
  requested_evidence text[] not null default '{}',
  request_summary text not null,
  response_summary text,
  source_channel text check (source_channel in ('email','api','manual','gorgias')),
  due_at timestamptz,
  sent_at timestamptz,
  response_received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_case_clarification_requests_case
  on case_clarification_requests(support_payout_case_id, created_at desc);
create index idx_case_clarification_requests_merchant_status
  on case_clarification_requests(merchant_id, status, due_at);
create index idx_case_clarification_requests_target
  on case_clarification_requests(merchant_id, target_type, status);
create trigger trg_case_clarification_requests_updated before update on case_clarification_requests
  for each row execute function set_updated_at();

create table claim_evidence (
  id            uuid primary key default gen_random_uuid(),
  claim_id      uuid not null references support_payout_cases(id) on delete cascade,
  merchant_id   uuid not null references merchants(id) on delete cascade,
  evidence_type text not null check (evidence_type in
    ('tracking','proof_of_delivery','customer_message','support_ticket',
     'return_label','warehouse_scan','payment_dispute','note','other',
     'damage_photo','packaging_photo','label_photo','wrong_item_photo',
     'proof_of_value','proof_of_dispatch','delivery_photo',
     'customer_non_receipt_statement','carrier_investigation',
     'warehouse_pick_pack_record','packing_slip','weight_scan',
     'refund_proof','reship_proof','supplier_batch_lot','purchase_order',
     'return_inspection','chargeback_notice','carrier_claim_correspondence',
     'three_pl_dispute_correspondence','supplier_credit_note')),
  storage_path  text,
  evidence_hash text,
  metadata      jsonb not null default '{}'::jsonb,
  added_by      uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index idx_claim_evidence_claim on claim_evidence(claim_id);

do $$
declare t text;
begin
  foreach t in array array['support_payout_cases','claim_events','claim_outcomes','case_clarification_requests','claim_evidence'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
create policy support_payout_cases_member_select on support_payout_cases for select to authenticated using (is_merchant_member(merchant_id));
create policy support_payout_cases_member_update on support_payout_cases for update to authenticated using (is_merchant_member(merchant_id));
create policy claim_events_member_select on claim_events for select to authenticated using (is_merchant_member(merchant_id));
create policy claim_outcomes_member_select on claim_outcomes for select to authenticated
  using (exists (select 1 from support_payout_cases c where c.id = claim_outcomes.claim_id and is_merchant_member(c.merchant_id)));
create policy case_clarification_requests_member_select on case_clarification_requests for select to authenticated
  using (is_merchant_member(merchant_id));
create policy case_clarification_requests_member_insert on case_clarification_requests for insert to authenticated
  with check (is_merchant_member(merchant_id));
create policy case_clarification_requests_member_update on case_clarification_requests for update to authenticated
  using (is_merchant_member(merchant_id)) with check (is_merchant_member(merchant_id));
create policy claim_evidence_member_select on claim_evidence for select to authenticated using (is_merchant_member(merchant_id));

-- Optional recovery operations layer: partner rulebook + chase-up workflow.
create table partners (
  id                 uuid primary key default gen_random_uuid(),
  merchant_id        uuid not null references merchants(id) on delete cascade,
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
create index idx_partners_merchant on partners(merchant_id);
create index idx_partners_partner_type on partners(merchant_id, partner_type);
create index idx_partners_status on partners(merchant_id, status);
create trigger trg_partners_updated before update on partners
  for each row execute function set_updated_at();

create table partner_recovery_rules (
  id                         uuid primary key default gen_random_uuid(),
  merchant_id                uuid not null references merchants(id) on delete cascade,
  partner_id                 uuid references partners(id) on delete set null,
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
create index idx_partner_recovery_rules_merchant on partner_recovery_rules(merchant_id);
create index idx_partner_recovery_rules_partner on partner_recovery_rules(partner_id) where partner_id is not null;
create index idx_partner_recovery_rules_recovery_type on partner_recovery_rules(merchant_id, recovery_type);
create index idx_partner_recovery_rules_claim_type on partner_recovery_rules(merchant_id, applies_to_claim_type);
create index idx_partner_recovery_rules_active on partner_recovery_rules(merchant_id, active);
create trigger trg_partner_recovery_rules_updated before update on partner_recovery_rules
  for each row execute function set_updated_at();

create table recovery_cases (
  id                         uuid primary key default gen_random_uuid(),
  merchant_id                uuid not null references merchants(id) on delete cascade,
  support_payout_case_id     uuid not null references support_payout_cases(id) on delete cascade,
  partner_id                 uuid references partners(id) on delete set null,
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
create index idx_recovery_cases_merchant on recovery_cases(merchant_id);
create index idx_recovery_cases_support_payout_case on recovery_cases(support_payout_case_id);
create index idx_recovery_cases_partner on recovery_cases(partner_id) where partner_id is not null;
create index idx_recovery_cases_status on recovery_cases(merchant_id, status);
create index idx_recovery_cases_deadline on recovery_cases(merchant_id, deadline_at) where deadline_at is not null;
create index idx_recovery_cases_next_chase on recovery_cases(merchant_id, next_chase_at) where next_chase_at is not null;
create index idx_recovery_cases_recovery_type on recovery_cases(merchant_id, recovery_type);
create trigger trg_recovery_cases_updated before update on recovery_cases
  for each row execute function set_updated_at();

create table recovery_case_events (
  id               uuid primary key default gen_random_uuid(),
  merchant_id      uuid not null references merchants(id) on delete cascade,
  recovery_case_id uuid not null references recovery_cases(id) on delete cascade,
  event_type       recovery_case_event_type not null,
  from_status      recovery_case_status,
  to_status        recovery_case_status,
  note             text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index idx_recovery_case_events_case on recovery_case_events(recovery_case_id, created_at desc);
create index idx_recovery_case_events_merchant on recovery_case_events(merchant_id, created_at desc);
create trigger trg_recovery_case_events_noupd before update or delete on recovery_case_events
  for each row execute function forbid_mutation();

do $$
declare t text;
begin
  foreach t in array array['partners','partner_recovery_rules','recovery_cases','recovery_case_events'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
create policy partners_member_all on partners for all to authenticated
  using (is_merchant_member(merchant_id)) with check (is_merchant_member(merchant_id));
create policy partner_recovery_rules_member_all on partner_recovery_rules for all to authenticated
  using (is_merchant_member(merchant_id)) with check (is_merchant_member(merchant_id));
create policy recovery_cases_member_all on recovery_cases for all to authenticated
  using (is_merchant_member(merchant_id)) with check (is_merchant_member(merchant_id));
create policy recovery_case_events_member_select on recovery_case_events for select to authenticated
  using (is_merchant_member(merchant_id));

-- ============================================================================
-- LAYER 5 — SERVING (rollups + k-anonymous cross-merchant access)
-- ============================================================================

-- Behavioural rollup per identity: rebuilt by the engine, never hand-edited.
create table identity_profiles (
  identity_id          uuid primary key references identities(id) on delete cascade,
  total_orders         integer not null default 0,
  total_claims         integer not null default 0,
  total_chargebacks    integer not null default 0,
  total_refund_amount  numeric(14,2) not null default 0,
  claim_rate           numeric(5,4),
  fastest_claim_days   numeric(8,2),          -- NULL when unknown; NO 99999 sentinels
  avg_claim_days       numeric(8,2),
  claim_type_counts    jsonb not null default '{}'::jsonb,
  merchant_count       integer not null default 0,
  first_seen_at        timestamptz,
  last_seen_at         timestamptz,
  refreshed_at         timestamptz not null default now()
);

-- Per-merchant view state (watchlist/notes/investigation) — merchant-owned,
-- references the network identity but reveals nothing cross-merchant by itself.
create table merchant_identity_state (
  merchant_id          uuid not null references merchants(id) on delete cascade,
  identity_id          uuid not null references identities(id) on delete cascade,
  on_watchlist         boolean not null default false,
  investigation_status text not null default 'new' check (investigation_status in
    ('new','under_review','contacted','resolved','cleared')),
  display_name         text,           -- merchant's own copy of THEIR customer's name
  display_email        text,
  updated_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  primary key (merchant_id, identity_id)
);
create trigger trg_mis_updated before update on merchant_identity_state
  for each row execute function set_updated_at();
alter table merchant_identity_state enable row level security;
create policy mis_member_all on merchant_identity_state
  for all to authenticated using (is_merchant_member(merchant_id));

create table identity_notes (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid not null references merchants(id) on delete cascade,
  identity_id  uuid not null references identities(id) on delete cascade,
  body         text not null,
  created_by   uuid references auth.users(id) on delete set null,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index idx_identity_notes on identity_notes(merchant_id, identity_id) where deleted_at is null;
alter table identity_notes enable row level security;
create policy identity_notes_member_all on identity_notes
  for all to authenticated using (is_merchant_member(merchant_id));

-- Every cross-merchant disclosure is logged (restores gen-1 discipline).
create table network_access_log (
  id                     uuid primary key default gen_random_uuid(),
  merchant_id            uuid not null references merchants(id) on delete cascade,
  queried_hashes         text[] not null,
  matched_identity_count integer not null default 0,
  k_anonymity_satisfied  boolean not null,
  request_ip             inet,
  created_at             timestamptz not null default now()
);
create index idx_network_access_log on network_access_log(merchant_id, created_at desc);
create trigger trg_network_access_log_noupd before update or delete on network_access_log
  for each row execute function forbid_mutation();

-- Network-level tables: service-role only. No authenticated path exists.
do $$
declare t text;
begin
  foreach t in array array[
    'identity_signals','identity_edges','identities','identity_members',
    'identity_resolution_events','identity_profiles','network_access_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
    execute format('create policy %I_service_only on %I for all to service_role using (true)', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- RPCs
-- ----------------------------------------------------------------------------

-- Ingest: bulk signal + edge upsert in one call (adapters emit one payload).
create or replace function ingest_identity_observations(
  p_merchant_id uuid,
  p_signals jsonb,   -- [{identifier_type, identifier_hash, source, source_order_id?, source_customer_id?, source_ticket_id?, observed_at?}]
  p_edges   jsonb    -- [{left_type,left_hash,right_type,right_hash,count_delta?}]
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into identity_signals
    (merchant_id, identifier_type, identifier_hash, source,
     source_order_id, source_customer_id, source_ticket_id, observed_at)
  select p_merchant_id,
         (s->>'identifier_type')::identifier_type,
         s->>'identifier_hash',
         (s->>'source')::signal_source,
         nullif(s->>'source_order_id','')::uuid,
         nullif(s->>'source_customer_id','')::uuid,
         nullif(s->>'source_ticket_id','')::uuid,
         coalesce(nullif(s->>'observed_at','')::timestamptz, now())
  from jsonb_array_elements(p_signals) s
  where coalesce(s->>'identifier_hash','') <> ''
  on conflict do nothing;

  insert into identity_edges
    (merchant_id, left_type, left_hash, right_type, right_hash, seen_count, source)
  select p_merchant_id,
         (e->>'left_type')::identifier_type, e->>'left_hash',
         (e->>'right_type')::identifier_type, e->>'right_hash',
         greatest(coalesce((e->>'count_delta')::int,1),1),
         coalesce((e->>'source')::signal_source,'manual')
  from jsonb_array_elements(p_edges) e
  where ((e->>'left_type'), e->>'left_hash') < ((e->>'right_type'), e->>'right_hash')
  on conflict (merchant_id, left_type, left_hash, right_type, right_hash)
  do update set seen_count = identity_edges.seen_count + excluded.seen_count,
                last_seen_at = now();
end $$;
revoke all on function ingest_identity_observations(uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function ingest_identity_observations(uuid,jsonb,jsonb) to service_role;

-- Serve: the widget's question — "who is this person across the network?"
-- K-anonymity enforced HERE (merchant_count >= 3), disclosure always logged.
create or replace function lookup_network_identity(
  p_merchant_id uuid,
  p_identifier_hashes jsonb,   -- [{type, hash}]
  p_request_ip inet default null
) returns table (
  identity_id uuid,
  confidence_grade confidence_grade,
  confidence_score numeric,
  merchant_count integer,
  total_orders integer,
  total_claims integer,
  total_chargebacks integer,
  claim_rate numeric,
  fastest_claim_days numeric,
  claim_type_counts jsonb,
  first_seen_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
  v_k_ok boolean;
begin
  select array_agg(distinct im.identity_id) into v_ids
  from jsonb_array_elements(p_identifier_hashes) q
  join identity_members im
    on im.identifier_type = (q->>'type')::identifier_type
   and im.identifier_hash = q->>'hash';

  -- k-anonymity: only disclose identities seen at >= 3 distinct merchants,
  -- OR identities the querying merchant has its own signals for.
  return query
  select i.id, i.confidence_grade, i.confidence_score, i.merchant_count,
         p.total_orders, p.total_claims, p.total_chargebacks, p.claim_rate,
         p.fastest_claim_days, p.claim_type_counts, p.first_seen_at, p.last_seen_at
  from identities i
  join identity_profiles p on p.identity_id = i.id
  where i.id = any(coalesce(v_ids,'{}')) and i.superseded_by is null
    and (i.merchant_count >= 3
         or exists (select 1 from identity_members im2
                    join identity_signals s
                      on s.identifier_type = im2.identifier_type
                     and s.identifier_hash = im2.identifier_hash
                    where im2.identity_id = i.id and s.merchant_id = p_merchant_id));

  select bool_and(i.merchant_count >= 3) into v_k_ok
  from identities i where i.id = any(coalesce(v_ids,'{}'));

  insert into network_access_log
    (merchant_id, queried_hashes, matched_identity_count, k_anonymity_satisfied, request_ip)
  select p_merchant_id,
         coalesce(array(select q->>'hash' from jsonb_array_elements(p_identifier_hashes) q),'{}'),
         coalesce(array_length(v_ids,1),0),
         coalesce(v_k_ok, true),
         p_request_ip;
end $$;
revoke all on function lookup_network_identity(uuid,jsonb,inet) from public, anon, authenticated;
grant execute on function lookup_network_identity(uuid,jsonb,inet) to service_role;

-- ============================================================================
-- LAYER 6 — OPS
-- ============================================================================

-- Universal webhook idempotency (one model for all providers).
create table processed_webhooks (
  idempotency_key text primary key,      -- '<provider>:<store_key>:<event_id>'
  provider        text not null,
  store_key       text,
  topic           text,
  status          text not null default 'received',
  attempts        integer not null default 0,
  last_error      text,
  processed_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_processed_webhooks_age on processed_webhooks(processed_at);
alter table processed_webhooks enable row level security;
revoke all on processed_webhooks from anon, authenticated;
create policy processed_webhooks_service on processed_webhooks for all to service_role using (true);

-- Sync/backfill jobs (replaces processing_jobs + chunks + csv_upload_queue +
-- background_intelligence_jobs with one job table + one chunk table).
create table sync_jobs (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references merchants(id) on delete cascade,
  job_kind      text not null check (job_kind in
    ('csv_audit','platform_backfill','helpdesk_backfill','reprocess')),
  source        signal_source,
  status        sync_job_status not null default 'pending',
  label         text,
  storage_path  text,
  file_hash     text,
  column_map    jsonb,
  total_rows    integer,
  processed_rows integer not null default 0,
  failed_rows   integer not null default 0,
  error_log     jsonb not null default '[]'::jsonb,
  finalize_claimed_at timestamptz,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,
  updated_at    timestamptz not null default now()
);
create index idx_sync_jobs_merchant on sync_jobs(merchant_id, created_at desc) where not hidden;
create index idx_sync_jobs_dedupe on sync_jobs(merchant_id, file_hash) where file_hash is not null;
create trigger trg_sync_jobs_updated before update on sync_jobs
  for each row execute function set_updated_at();
alter table sync_jobs enable row level security;
create policy sync_jobs_member_select on sync_jobs
  for select to authenticated using (is_merchant_member(merchant_id));

create table sync_job_chunks (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references sync_jobs(id) on delete cascade,
  chunk_index  integer not null,
  status       sync_job_status not null default 'pending',
  claimed_at   timestamptz,
  completed_at timestamptz,
  last_error   text,
  unique (job_id, chunk_index)
);
create index idx_sync_job_chunks_pending on sync_job_chunks(job_id) where status = 'pending';
alter table sync_job_chunks enable row level security;
revoke all on sync_job_chunks from anon, authenticated;
create policy sync_job_chunks_service on sync_job_chunks for all to service_role using (true);

-- Atomic progress (kept — these RPCs fixed real races).
create or replace function increment_job_progress(
  p_job_id uuid, p_processed_delta integer, p_failed_delta integer default 0
) returns void language sql security definer set search_path = public as $$
  update sync_jobs
  set processed_rows = processed_rows + p_processed_delta,
      failed_rows = failed_rows + p_failed_delta
  where id = p_job_id;
$$;
revoke all on function increment_job_progress(uuid,integer,integer) from public, anon, authenticated;
grant execute on function increment_job_progress(uuid,integer,integer) to service_role;

-- Billing tables are carried over unchanged from the current schema
-- (plans, merchant_subscriptions, merchant_credits, context_credit_events,
-- credit_topup_log, billing_events_log, and their RPCs). They are sound,
-- recently built, and orthogonal to identity — see migration plan §5.
