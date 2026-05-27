-- One-off purge for demo reseeds when claim_events append-only triggers block API deletes.
-- Replace :merchant_id before running in Supabase SQL editor.

BEGIN;

ALTER TABLE public.claim_events DISABLE TRIGGER trg_prevent_claim_events_delete;

DELETE FROM public.claim_evidence_items
WHERE claim_id IN (SELECT id FROM public.merchant_claims WHERE merchant_id = :'merchant_id');

DELETE FROM public.merchant_case_outcomes
WHERE claim_id IN (SELECT id FROM public.merchant_claims WHERE merchant_id = :'merchant_id');

DELETE FROM public.claim_events
WHERE claim_id IN (SELECT id FROM public.merchant_claims WHERE merchant_id = :'merchant_id');

DELETE FROM public.merchant_claims WHERE merchant_id = :'merchant_id';

ALTER TABLE public.claim_events ENABLE TRIGGER trg_prevent_claim_events_delete;

COMMIT;
