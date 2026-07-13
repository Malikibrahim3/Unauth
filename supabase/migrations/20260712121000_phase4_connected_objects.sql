-- Phase 4: stable merchant-customer links and connected-object lookup indexes.
-- Additive and safe to run while legacy source-customer routes remain live.
begin;

alter table public.source_customers
  add column if not exists merchant_customer_id uuid
  references public.merchant_customers(id) on delete set null;

create index if not exists idx_source_customers_merchant_customer
  on public.source_customers (merchant_id, merchant_customer_id)
  where merchant_customer_id is not null;

-- Use an existing merchant-local identity when it is unambiguous. Otherwise a
-- source customer receives its own aggregate; this deliberately avoids linking
-- customers merely because mutable PII happens to match.
insert into public.merchant_customers
  (id, merchant_id, identity_id, display_name, email, raw_metadata, created_at, updated_at)
select gen_random_uuid(), sc.merchant_id, null,
       nullif(trim(concat_ws(' ', sc.first_name, sc.last_name)), ''), sc.email,
       jsonb_build_object('backfill', 'source_customer', 'source_customer_id', sc.id),
       sc.created_at, sc.updated_at
from public.source_customers sc
where sc.merchant_customer_id is null
  and not exists (
    select 1 from public.merchant_customers mc
    where mc.merchant_id = sc.merchant_id
      and mc.raw_metadata->>'source_customer_id' = sc.id::text
  );

update public.source_customers sc
set merchant_customer_id = (
  select mc.id
  from public.merchant_customers mc
  where mc.merchant_id = sc.merchant_id
    and mc.raw_metadata->>'source_customer_id' = sc.id::text
  order by mc.created_at
  limit 1
)
where sc.merchant_customer_id is null;

create index if not exists idx_source_refunds_merchant_external
  on public.source_refunds (merchant_id, external_id);
create index if not exists idx_source_returns_merchant_external
  on public.source_returns (merchant_id, external_id);
create index if not exists idx_source_disputes_merchant_external
  on public.source_disputes (merchant_id, external_id);
create index if not exists idx_source_tickets_merchant_external
  on public.source_tickets (merchant_id, external_id);

commit;
