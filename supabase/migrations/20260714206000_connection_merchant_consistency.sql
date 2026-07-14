-- Prevent service code from pairing a tenant row with another merchant's
-- connection or source account, even when RLS is bypassed by a worker.

begin;

alter table public.source_accounts
  drop constraint if exists source_accounts_id_merchant_id_key;
alter table public.source_accounts
  add constraint source_accounts_id_merchant_id_key unique (id, merchant_id);

alter table public.source_records
  drop constraint if exists source_records_id_merchant_id_key;
alter table public.source_records
  add constraint source_records_id_merchant_id_key unique (id, merchant_id);

alter table public.ingestion_events
  drop constraint if exists ingestion_events_id_merchant_id_key;
alter table public.ingestion_events
  add constraint ingestion_events_id_merchant_id_key unique (id, merchant_id);

alter table public.domain_events
  drop constraint if exists domain_events_id_merchant_id_key;
alter table public.domain_events
  add constraint domain_events_id_merchant_id_key unique (id, merchant_id);

alter table public.source_orders
  drop constraint if exists source_orders_id_merchant_id_key;
alter table public.source_orders
  add constraint source_orders_id_merchant_id_key unique (id, merchant_id);

alter table public.source_fulfillments
  drop constraint if exists source_fulfillments_id_merchant_id_key;
alter table public.source_fulfillments
  add constraint source_fulfillments_id_merchant_id_key unique (id, merchant_id);

alter table public.source_accounts
  drop constraint if exists source_accounts_connection_merchant_fkey;
alter table public.source_accounts
  add constraint source_accounts_connection_merchant_fkey
  foreign key (connection_id, merchant_id)
  references public.merchant_integrations (id, merchant_id)
  on delete cascade not valid;

alter table public.source_records
  drop constraint if exists source_records_connection_merchant_fkey;
alter table public.source_records
  add constraint source_records_connection_merchant_fkey
  foreign key (connection_id, merchant_id)
  references public.merchant_integrations (id, merchant_id)
  on delete no action not valid;
alter table public.source_records
  drop constraint if exists source_records_account_merchant_fkey;
alter table public.source_records
  add constraint source_records_account_merchant_fkey
  foreign key (source_account_id, merchant_id)
  references public.source_accounts (id, merchant_id)
  on delete no action not valid;

alter table public.sync_jobs
  drop constraint if exists sync_jobs_connection_merchant_fkey;
alter table public.sync_jobs
  add constraint sync_jobs_connection_merchant_fkey
  foreign key (connection_id, merchant_id)
  references public.merchant_integrations (id, merchant_id)
  on delete no action not valid;
alter table public.sync_jobs
  drop constraint if exists sync_jobs_account_merchant_fkey;
alter table public.sync_jobs
  add constraint sync_jobs_account_merchant_fkey
  foreign key (source_account_id, merchant_id)
  references public.source_accounts (id, merchant_id)
  on delete no action not valid;

alter table public.ingestion_events
  drop constraint if exists ingestion_events_connection_merchant_fkey;
alter table public.ingestion_events
  add constraint ingestion_events_connection_merchant_fkey
  foreign key (connection_id, merchant_id)
  references public.merchant_integrations (id, merchant_id)
  on delete no action not valid;

alter table public.domain_events
  drop constraint if exists domain_events_connection_merchant_fkey;
alter table public.domain_events
  add constraint domain_events_connection_merchant_fkey
  foreign key (connection_id, merchant_id)
  references public.merchant_integrations (id, merchant_id)
  on delete no action not valid;
alter table public.domain_events
  drop constraint if exists domain_events_ingestion_merchant_fkey;
alter table public.domain_events
  add constraint domain_events_ingestion_merchant_fkey
  foreign key (ingestion_event_id, merchant_id)
  references public.ingestion_events (id, merchant_id)
  on delete no action not valid;
alter table public.domain_events
  drop constraint if exists domain_events_source_record_merchant_fkey;
alter table public.domain_events
  add constraint domain_events_source_record_merchant_fkey
  foreign key (source_record_id, merchant_id)
  references public.source_records (id, merchant_id)
  on delete no action not valid;

alter table public.domain_event_deliveries
  drop constraint if exists domain_event_deliveries_event_merchant_fkey;
alter table public.domain_event_deliveries
  add constraint domain_event_deliveries_event_merchant_fkey
  foreign key (domain_event_id, merchant_id)
  references public.domain_events (id, merchant_id)
  on delete cascade not valid;

alter table public.source_orders
  drop constraint if exists source_orders_account_merchant_fkey;
alter table public.source_orders
  add constraint source_orders_account_merchant_fkey
  foreign key (source_account_id, merchant_id)
  references public.source_accounts (id, merchant_id)
  on delete no action not valid;

alter table public.source_fulfillments
  drop constraint if exists source_fulfillments_order_merchant_fkey;
alter table public.source_fulfillments
  add constraint source_fulfillments_order_merchant_fkey
  foreign key (source_order_id, merchant_id)
  references public.source_orders (id, merchant_id)
  on delete cascade not valid;

alter table public.source_locations
  drop constraint if exists source_locations_account_merchant_fkey;
alter table public.source_locations
  add constraint source_locations_account_merchant_fkey
  foreign key (source_account_id, merchant_id)
  references public.source_accounts (id, merchant_id)
  on delete no action not valid;
alter table public.source_locations
  drop constraint if exists source_locations_record_merchant_fkey;
alter table public.source_locations
  add constraint source_locations_record_merchant_fkey
  foreign key (source_record_id, merchant_id)
  references public.source_records (id, merchant_id)
  on delete no action not valid;

alter table public.source_shipments
  drop constraint if exists source_shipments_account_merchant_fkey;
alter table public.source_shipments
  add constraint source_shipments_account_merchant_fkey
  foreign key (source_account_id, merchant_id)
  references public.source_accounts (id, merchant_id)
  on delete no action not valid;
alter table public.source_shipments
  drop constraint if exists source_shipments_order_merchant_fkey;
alter table public.source_shipments
  add constraint source_shipments_order_merchant_fkey
  foreign key (source_order_id, merchant_id)
  references public.source_orders (id, merchant_id)
  on delete no action not valid;
alter table public.source_shipments
  drop constraint if exists source_shipments_fulfillment_merchant_fkey;
alter table public.source_shipments
  add constraint source_shipments_fulfillment_merchant_fkey
  foreign key (source_fulfillment_id, merchant_id)
  references public.source_fulfillments (id, merchant_id)
  on delete no action not valid;
alter table public.source_shipments
  drop constraint if exists source_shipments_record_merchant_fkey;
alter table public.source_shipments
  add constraint source_shipments_record_merchant_fkey
  foreign key (source_record_id, merchant_id)
  references public.source_records (id, merchant_id)
  on delete no action not valid;

alter table public.source_returns
  drop constraint if exists source_returns_account_merchant_fkey;
alter table public.source_returns
  add constraint source_returns_account_merchant_fkey
  foreign key (source_account_id, merchant_id)
  references public.source_accounts (id, merchant_id)
  on delete no action not valid;
alter table public.source_returns
  drop constraint if exists source_returns_order_merchant_fkey;
alter table public.source_returns
  add constraint source_returns_order_merchant_fkey
  foreign key (source_order_id, merchant_id)
  references public.source_orders (id, merchant_id)
  on delete no action not valid;
alter table public.source_returns
  drop constraint if exists source_returns_record_merchant_fkey;
alter table public.source_returns
  add constraint source_returns_record_merchant_fkey
  foreign key (source_record_id, merchant_id)
  references public.source_records (id, merchant_id)
  on delete no action not valid;

alter table public.source_accounts validate constraint source_accounts_connection_merchant_fkey;
alter table public.source_records validate constraint source_records_connection_merchant_fkey;
alter table public.source_records validate constraint source_records_account_merchant_fkey;
alter table public.sync_jobs validate constraint sync_jobs_connection_merchant_fkey;
alter table public.sync_jobs validate constraint sync_jobs_account_merchant_fkey;
alter table public.ingestion_events validate constraint ingestion_events_connection_merchant_fkey;
alter table public.domain_events validate constraint domain_events_connection_merchant_fkey;
alter table public.domain_events validate constraint domain_events_ingestion_merchant_fkey;
alter table public.domain_events validate constraint domain_events_source_record_merchant_fkey;
alter table public.domain_event_deliveries validate constraint domain_event_deliveries_event_merchant_fkey;
alter table public.source_orders validate constraint source_orders_account_merchant_fkey;
alter table public.source_fulfillments validate constraint source_fulfillments_order_merchant_fkey;
alter table public.source_locations validate constraint source_locations_account_merchant_fkey;
alter table public.source_locations validate constraint source_locations_record_merchant_fkey;
alter table public.source_shipments validate constraint source_shipments_account_merchant_fkey;
alter table public.source_shipments validate constraint source_shipments_order_merchant_fkey;
alter table public.source_shipments validate constraint source_shipments_fulfillment_merchant_fkey;
alter table public.source_shipments validate constraint source_shipments_record_merchant_fkey;
alter table public.source_returns validate constraint source_returns_account_merchant_fkey;
alter table public.source_returns validate constraint source_returns_order_merchant_fkey;
alter table public.source_returns validate constraint source_returns_record_merchant_fkey;

commit;
