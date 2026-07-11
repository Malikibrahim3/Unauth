-- 20260711130000_canonical_entity_model.sql
--
-- Source-Agnostic MVP+ — Phase 3: the missing canonical record types plus the
-- merchant-local customer aggregate and ingestion field-error log. Additive.
--
-- Every table: id, merchant_id, parent FK(s) where known, source-neutral
-- normalized fields, raw_metadata jsonb, timestamps. Money is integer minor
-- units + ISO currency. Source identity is account-scoped (uniqueness through a
-- connection/account, not a provider-specific column). RLS: member select,
-- service-role write.

begin;

-- merchant_customers — stable merchant-local customer aggregate.
create table if not exists public.merchant_customers (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  identity_id   uuid,               -- optional link to the network identity aggregate
  display_name  text,
  email         text,
  raw_metadata  jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_merchant_customers_merchant on public.merchant_customers (merchant_id);
create index if not exists idx_merchant_customers_identity on public.merchant_customers (identity_id) where identity_id is not null;
create trigger trg_merchant_customers_updated before update on public.merchant_customers
  for each row execute function set_updated_at();

-- source_order_lines
create table if not exists public.source_order_lines (
  id                 uuid primary key default gen_random_uuid(),
  merchant_id        uuid not null references public.merchants(id) on delete cascade,
  source_order_id    uuid not null references public.source_orders(id) on delete cascade,
  source_record_id   uuid references public.source_records(id) on delete set null,
  external_id        text not null,
  sku                text,
  product_ref        text,
  variant_ref        text,
  title              text,
  quantity           integer,
  unit_price_minor   bigint,
  total_minor        bigint,
  cost_minor         bigint,
  currency           char(3),
  raw_metadata       jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (merchant_id, source_order_id, external_id)
);
create index if not exists idx_source_order_lines_order on public.source_order_lines (source_order_id);
create trigger trg_source_order_lines_updated before update on public.source_order_lines
  for each row execute function set_updated_at();

-- source_payments
create table if not exists public.source_payments (
  id                 uuid primary key default gen_random_uuid(),
  merchant_id        uuid not null references public.merchants(id) on delete cascade,
  source_account_id  uuid references public.source_accounts(id) on delete set null,
  source_order_id    uuid references public.source_orders(id) on delete set null,
  source_customer_id uuid references public.source_customers(id) on delete set null,
  source_record_id   uuid references public.source_records(id) on delete set null,
  external_id        text not null,
  provider           text,
  method_category    text,
  status             text,
  source_status      text,
  amount_minor       bigint,
  currency           char(3),
  captured_at        timestamptz,
  refunded_at        timestamptz,
  raw_metadata       jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique nulls not distinct (merchant_id, source_account_id, external_id)
);
create index if not exists idx_source_payments_order on public.source_payments (source_order_id) where source_order_id is not null;
create trigger trg_source_payments_updated before update on public.source_payments
  for each row execute function set_updated_at();

-- source_transactions
create table if not exists public.source_transactions (
  id                   uuid primary key default gen_random_uuid(),
  merchant_id          uuid not null references public.merchants(id) on delete cascade,
  source_account_id    uuid references public.source_accounts(id) on delete set null,
  source_order_id      uuid references public.source_orders(id) on delete set null,
  source_payment_id    uuid references public.source_payments(id) on delete set null,
  source_record_id     uuid references public.source_records(id) on delete set null,
  external_id          text not null,
  transaction_type     text,
  status               text,
  source_status        text,
  amount_minor         bigint,
  currency             char(3),
  parent_transaction_ref text,
  provider_reference   text,
  occurred_at          timestamptz,
  raw_metadata         jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique nulls not distinct (merchant_id, source_account_id, external_id)
);
create index if not exists idx_source_transactions_order on public.source_transactions (source_order_id) where source_order_id is not null;
create trigger trg_source_transactions_updated before update on public.source_transactions
  for each row execute function set_updated_at();

-- source_replacements
create table if not exists public.source_replacements (
  id                     uuid primary key default gen_random_uuid(),
  merchant_id            uuid not null references public.merchants(id) on delete cascade,
  source_account_id      uuid references public.source_accounts(id) on delete set null,
  source_order_id        uuid references public.source_orders(id) on delete set null,
  support_payout_case_id uuid references public.support_payout_cases(id) on delete set null,
  source_record_id       uuid references public.source_records(id) on delete set null,
  external_id            text not null,
  status                 text,
  source_status          text,
  original_line_ref      text,
  replacement_line_ref   text,
  item_value_minor       bigint,
  shipping_cost_minor    bigint,
  currency               char(3),
  issued_at              timestamptz,
  raw_metadata           jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique nulls not distinct (merchant_id, source_account_id, external_id)
);
create index if not exists idx_source_replacements_order on public.source_replacements (source_order_id) where source_order_id is not null;
create trigger trg_source_replacements_updated before update on public.source_replacements
  for each row execute function set_updated_at();

-- source_shipments
create table if not exists public.source_shipments (
  id                   uuid primary key default gen_random_uuid(),
  merchant_id          uuid not null references public.merchants(id) on delete cascade,
  source_account_id    uuid references public.source_accounts(id) on delete set null,
  source_order_id      uuid references public.source_orders(id) on delete set null,
  source_fulfillment_id uuid references public.source_fulfillments(id) on delete set null,
  source_record_id     uuid references public.source_records(id) on delete set null,
  external_id          text not null,
  tracking_number      text,
  carrier              text,
  service              text,
  status               text,          -- canonical
  source_status        text,          -- provider-native
  shipped_at           timestamptz,
  delivered_at         timestamptz,
  raw_metadata         jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique nulls not distinct (merchant_id, source_account_id, external_id)
);
create index if not exists idx_source_shipments_order on public.source_shipments (source_order_id) where source_order_id is not null;
create index if not exists idx_source_shipments_tracking on public.source_shipments (merchant_id, tracking_number) where tracking_number is not null;
create trigger trg_source_shipments_updated before update on public.source_shipments
  for each row execute function set_updated_at();

-- source_tracking_events
create table if not exists public.source_tracking_events (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references public.merchants(id) on delete cascade,
  source_shipment_id  uuid not null references public.source_shipments(id) on delete cascade,
  source_record_id    uuid references public.source_records(id) on delete set null,
  external_id         text not null,
  status              text,           -- canonical
  source_status       text,           -- provider-native
  location_text       text,
  description         text,
  event_at            timestamptz,
  source_event_at     timestamptz,
  raw_metadata        jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  unique (merchant_id, source_shipment_id, external_id)
);
create index if not exists idx_source_tracking_events_shipment on public.source_tracking_events (source_shipment_id, event_at);

-- source_returns
create table if not exists public.source_returns (
  id                     uuid primary key default gen_random_uuid(),
  merchant_id            uuid not null references public.merchants(id) on delete cascade,
  source_account_id      uuid references public.source_accounts(id) on delete set null,
  source_order_id        uuid references public.source_orders(id) on delete set null,
  support_payout_case_id uuid references public.support_payout_cases(id) on delete set null,
  source_record_id       uuid references public.source_records(id) on delete set null,
  external_id            text not null,
  status                 text,
  source_status          text,
  disposition            text,
  requested_at           timestamptz,
  received_at            timestamptz,
  inspected_at           timestamptz,
  refund_reference       text,
  replacement_reference  text,
  raw_metadata           jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique nulls not distinct (merchant_id, source_account_id, external_id)
);
create index if not exists idx_source_returns_order on public.source_returns (source_order_id) where source_order_id is not null;
create trigger trg_source_returns_updated before update on public.source_returns
  for each row execute function set_updated_at();

-- source_messages (distinct from source_ticket_events history)
create table if not exists public.source_messages (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references public.merchants(id) on delete cascade,
  source_ticket_id    uuid not null references public.source_tickets(id) on delete cascade,
  source_record_id    uuid references public.source_records(id) on delete set null,
  external_id         text not null,
  actor_type          text,
  channel             text,
  visibility          text,
  summary             text,
  body_ref            text,           -- pointer per retention policy (no raw PII inline by default)
  attachment_metadata jsonb not null default '[]'::jsonb,
  sent_at             timestamptz,
  source_sent_at      timestamptz,
  raw_metadata        jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  unique (merchant_id, source_ticket_id, external_id)
);
create index if not exists idx_source_messages_ticket on public.source_messages (source_ticket_id, sent_at);

-- ingestion_field_errors
create table if not exists public.ingestion_field_errors (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references public.merchants(id) on delete cascade,
  ingestion_event_id  uuid references public.ingestion_events(id) on delete set null,
  source_record_id    uuid references public.source_records(id) on delete set null,
  field               text not null,
  code                text not null,
  severity            text not null default 'error' check (severity in ('info','warning','error')),
  raw_value_hash      text,
  message             text,
  resolution_status   text not null default 'open' check (resolution_status in ('open','resolved','ignored')),
  created_at          timestamptz not null default now()
);
create index if not exists idx_ingestion_field_errors_merchant on public.ingestion_field_errors (merchant_id, created_at desc);

-- RLS + grants: member select, service-role write.
do $$
declare t text;
begin
  foreach t in array array[
    'merchant_customers','source_order_lines','source_payments','source_transactions',
    'source_replacements','source_shipments','source_tracking_events','source_returns',
    'source_messages','ingestion_field_errors'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_member_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (is_merchant_member(merchant_id))',
      t||'_member_select', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
