alter table public.processed_webhooks
  add column if not exists status text not null default 'received',
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error text,
  add column if not exists topic text,
  add column if not exists shop_domain text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.shopify_merchants
  alter column access_token drop not null;

alter table public.shopify_merchants
  add column if not exists uninstalled_at timestamptz;

alter table public.merchant_shopify_connections
  add column if not exists active boolean not null default true,
  add column if not exists uninstalled_at timestamptz;

