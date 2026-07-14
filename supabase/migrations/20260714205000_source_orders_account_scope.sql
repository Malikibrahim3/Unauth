-- ShipBob order identity follows the selected source account. NULLS NOT
-- DISTINCT preserves legacy/Shopify uniqueness while allowing isolated 3PL
-- account histories for one merchant.

begin;

alter table public.source_orders
  add column if not exists source_account_id uuid references public.source_accounts(id) on delete set null;

update public.source_orders so
set source_account_id = sr.source_account_id
from public.source_records sr
where so.source = 'shipbob'
  and so.source_account_id is null
  and so.raw_payload_hash = sr.id::text
  and sr.merchant_id = so.merchant_id
  and sr.source_entity_type = 'order';

alter table public.source_orders
  drop constraint if exists source_orders_merchant_id_source_external_id_key;

drop index if exists public.source_orders_account_external_key;

create unique index if not exists source_orders_account_external_key
  on public.source_orders (merchant_id, source, connection_id, source_account_id, external_id)
  nulls not distinct;

alter table public.source_customers
  drop constraint if exists source_customers_merchant_id_source_external_id_key;
drop index if exists public.source_customers_merchant_id_source_external_id_key;
create unique index if not exists source_customers_connection_external_key
  on public.source_customers (merchant_id, source, connection_id, external_id)
  nulls not distinct;

alter table public.source_disputes
  drop constraint if exists source_disputes_merchant_id_external_id_key;
drop index if exists public.source_disputes_merchant_id_external_id_key;
create unique index if not exists source_disputes_order_external_key
  on public.source_disputes (merchant_id, source_order_id, external_id)
  nulls not distinct;

create index if not exists source_orders_source_account_idx
  on public.source_orders (merchant_id, source_account_id)
  where source_account_id is not null;

commit;
