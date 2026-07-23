begin;

-- Phase 7.1 (final): retire the claim_evidence store into canonical evidence_items.
-- Reproduce the fulfillment-sync idempotency guarantee (one auto-attached delivery
-- evidence row per case) that previously lived on claim_evidence.
create unique index if not exists evidence_items_fulfillment_sync_uniq
  on public.evidence_items (claim_id)
  where (source_metadata ->> 'auto_source') = 'fulfillment_sync';

-- Support fast reads of the claim_evidence-origin subset (backfilled rows carry
-- legacy_table='claim_evidence'; new runtime writes carry origin_store='claim_evidence').
create index if not exists evidence_items_claim_origin_idx
  on public.evidence_items (merchant_id, claim_id)
  where claim_id is not null
    and (source_metadata ->> 'origin_store' = 'claim_evidence'
      or source_metadata ->> 'legacy_table' = 'claim_evidence');

commit;
