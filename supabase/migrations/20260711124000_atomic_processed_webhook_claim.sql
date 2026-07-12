-- 20260711124000_atomic_processed_webhook_claim.sql
--
-- Atomic webhook idempotency claim. The previous read-then-upsert flow had a
-- TOCTOU race: two concurrent deliveries of the same webhook could both read
-- "not completed" and both proceed. This single-statement RPC closes it:
-- INSERT ... ON CONFLICT DO UPDATE ... WHERE status <> 'completed' takes the row
-- lock atomically. A conflict that hits an already-completed row updates nothing
-- (row_count = 0) and is reported as a duplicate.

begin;

create or replace function public.claim_processed_webhook(
  p_key text,
  p_provider text,
  p_store_key text,
  p_topic text
) returns boolean  -- true = duplicate (already completed); false = claimed by this caller
  language plpgsql security definer set search_path = public as $$
declare
  v_rows integer;
begin
  insert into public.processed_webhooks
    (idempotency_key, provider, store_key, topic, status, attempts, last_error, updated_at)
  values
    (p_key, p_provider, p_store_key, p_topic, 'processing', 1, null, now())
  on conflict (idempotency_key) do update
    set attempts = public.processed_webhooks.attempts + 1,
        status = 'processing',
        last_error = null,
        updated_at = now()
    where public.processed_webhooks.status <> 'completed';

  get diagnostics v_rows = row_count;
  -- row_count = 1 when inserted or (re)claimed; 0 when the conflict target was an
  -- already-completed row (the WHERE excluded the update) => duplicate.
  return v_rows = 0;
end;
$$;

revoke all on function public.claim_processed_webhook(text, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_processed_webhook(text, text, text, text) to service_role;

notify pgrst, 'reload schema';

commit;
