-- Follow-up to 20260718110000_purge_simeon_seeded_data.sql: that purge deleted
-- source_orders for Simeon Murray Store (af070af9-df1a-46ba-89f8-29409926ef61)
-- but missed source_shipments (source_order_id references source_orders(id)
-- on delete set null, so the rows survived with a null order link instead of
-- being removed). These are orphaned seed debris, not real data — clear them.

begin;

delete from public.source_shipments
where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61'
  and source_order_id is null;

commit;
