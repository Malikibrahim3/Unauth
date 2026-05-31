-- Migration: add merchant_id to audit_transactions + unique dedup index (#21)
--
-- PROBLEM
--   Re-uploading the same orders for a merchant created duplicate
--   audit_transactions rows. CSV uploads deduped only on (job_id, order_id) and
--   each upload gets a fresh job_id, so a re-upload (or any forced re-upload of a
--   changed export) inserted a whole new set of rows. Shopify sync deduped on
--   (shop_domain, order_id) via ux_audit_transactions_shop_domain_order_id.
--
-- FIX
--   Add a merchant_id column and a unique index so the CSV / manual ingest path
--   can upsert on (merchant_id, order_id, source) instead of (job_id, order_id).
--
-- WHY THE INDEX INCLUDES `source`
--   A plain (merchant_id, order_id) unique index would also apply to Shopify
--   rows. If a merchant BOTH connects Shopify AND uploads a CSV that happens to
--   contain the same order_id, the Shopify upsert (which resolves conflicts on
--   shop_domain,order_id) would hit the merchant index unexpectedly and error.
--   Scoping the index by `source` keeps CSV/demo/public rows deduped per merchant
--   without interfering with the Shopify path. (Known edge case: a single merchant
--   running two Shopify shops that share an order_id — extremely rare; the Shopify
--   path still uses its own shop_domain,order_id index for that case.)
--
-- ROLLOUT (IMPORTANT)
--   The application only writes merchant_id and switches its upsert key when the
--   env flag AUDIT_TX_MERCHANT_DEDUP=true. Apply this migration FIRST, confirm the
--   index exists, THEN set the flag. Until then the app keeps using
--   (job_id, order_id) and is unaffected.

begin;

-- 1. Column. Nullable on purpose: legacy rows whose merchant cannot be resolved
--    stay NULL, and Postgres treats NULLs as DISTINCT in a unique index, so they
--    never block index creation or upserts.
alter table public.audit_transactions
  add column if not exists merchant_id uuid;

-- 2. Backfill from the owning processing job (CSV / public / demo rows).
update public.audit_transactions at
   set merchant_id = pj.merchant_id
  from public.processing_jobs pj
 where at.job_id = pj.id
   and at.merchant_id is null
   and pj.merchant_id is not null;

-- 3. Backfill Shopify-synced rows (which may have no job_id) from the
--    connection's shop_domain.
update public.audit_transactions at
   set merchant_id = msc.merchant_id
  from public.merchant_shopify_connections msc
 where at.merchant_id is null
   and at.shop_domain is not null
   and at.shop_domain = msc.shop_domain
   and msc.merchant_id is not null;

-- 4. Collapse pre-existing duplicates so the unique index can be created.
--    Keep the most recently processed row per (merchant_id, order_id, source);
--    delete older duplicates. NULL merchant_id and NULL source rows are left
--    untouched (they are DISTINCT under the index and cannot violate it).
delete from public.audit_transactions a
 using public.audit_transactions b
 where a.merchant_id is not null
   and a.merchant_id = b.merchant_id
   and a.order_id    = b.order_id
   and a.source      = b.source          -- NULL-safe: NULL = NULL is false, so NULL-source rows are never deleted
   and (
        coalesce(a.processed_at, 'epoch'::timestamptz) < coalesce(b.processed_at, 'epoch'::timestamptz)
        or (
             coalesce(a.processed_at, 'epoch'::timestamptz) = coalesce(b.processed_at, 'epoch'::timestamptz)
             and a.id < b.id
           )
       );

-- 5. Unique index used by the CSV / manual ingest upsert
--    (supabase-js onConflict: 'merchant_id,order_id,source'). Must be NON-partial
--    so PostgREST can use it as an ON CONFLICT arbiter.
create unique index if not exists ux_audit_transactions_merchant_order_source
  on public.audit_transactions (merchant_id, order_id, source);

-- 6. Foreign key, added NOT VALID so any legacy/unresolved rows do not block the
--    migration. Validate later once data is confirmed clean:
--      ALTER TABLE public.audit_transactions VALIDATE CONSTRAINT audit_transactions_merchant_id_fkey;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'audit_transactions_merchant_id_fkey'
  ) then
    alter table public.audit_transactions
      add constraint audit_transactions_merchant_id_fkey
      foreign key (merchant_id) references public.merchants(id) on delete cascade
      not valid;
  end if;
end $$;

commit;

-- ROLLBACK (manual):
--   drop index if exists ux_audit_transactions_merchant_order_source;
--   alter table public.audit_transactions drop constraint if exists audit_transactions_merchant_id_fkey;
--   alter table public.audit_transactions drop column if exists merchant_id;
