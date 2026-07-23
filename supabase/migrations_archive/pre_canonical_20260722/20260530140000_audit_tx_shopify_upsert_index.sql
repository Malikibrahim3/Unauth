-- PostgREST/Supabase upsert onConflict cannot infer PARTIAL unique indexes (Postgres 42P10).
-- sync-audit uses onConflict: 'shop_domain,order_id' — requires a non-partial unique index.
-- CSV rows keep shop_domain NULL; PostgreSQL treats NULL shop_domain as distinct per row.

DROP INDEX IF EXISTS ux_audit_transactions_shopify_shop_order;

CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_transactions_shop_domain_order_id
  ON audit_transactions (shop_domain, order_id);
