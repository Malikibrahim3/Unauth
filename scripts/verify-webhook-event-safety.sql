\set ON_ERROR_STOP on

begin;

do $acceptance$
declare
  v_result jsonb;
  v_first_token uuid;
  v_retry_token uuid;
  v_expired_token uuid;
  v_reclaimed_token uuid;
begin
  v_result := public.claim_processed_webhook(
    'runtime:account-a:delivery-retry',
    'runtime',
    'account-a',
    'order.updated',
    repeat('a', 64),
    300
  );
  if v_result->>'status' <> 'claimed' then
    raise exception 'initial delivery was not claimed: %', v_result;
  end if;
  v_first_token := (v_result->>'claim_token')::uuid;

  v_result := public.claim_processed_webhook(
    'runtime:account-a:delivery-retry',
    'runtime',
    'account-a',
    'order.updated',
    repeat('a', 64),
    300
  );
  if v_result->>'status' <> 'in_progress' then
    raise exception 'active concurrent delivery was not fenced: %', v_result;
  end if;

  v_result := public.claim_processed_webhook(
    'runtime:account-a:delivery-retry',
    'runtime',
    'account-a',
    'order.updated',
    repeat('b', 64),
    300
  );
  if v_result->>'status' <> 'conflict' then
    raise exception 'modified delivery did not conflict: %', v_result;
  end if;

  if public.complete_processed_webhook(
    'runtime:account-a:delivery-retry',
    gen_random_uuid(),
    'completed',
    null
  ) then
    raise exception 'an unrelated worker completed the delivery';
  end if;

  if not public.complete_processed_webhook(
    'runtime:account-a:delivery-retry',
    v_first_token,
    'failed',
    'synthetic partial failure'
  ) then
    raise exception 'the owning worker could not record a retryable failure';
  end if;

  v_result := public.claim_processed_webhook(
    'runtime:account-a:delivery-retry',
    'runtime',
    'account-a',
    'order.updated',
    repeat('a', 64),
    300
  );
  if v_result->>'status' <> 'claimed' then
    raise exception 'failed delivery was not reclaimed: %', v_result;
  end if;
  v_retry_token := (v_result->>'claim_token')::uuid;

  if public.complete_processed_webhook(
    'runtime:account-a:delivery-retry',
    v_first_token,
    'completed',
    null
  ) then
    raise exception 'stale worker completed a newer retry';
  end if;

  if not public.complete_processed_webhook(
    'runtime:account-a:delivery-retry',
    v_retry_token,
    'completed',
    null,
    '{"status":201,"body":{"id":"synthetic-result"}}'::jsonb
  ) then
    raise exception 'retry owner could not complete the delivery';
  end if;

  v_result := public.claim_processed_webhook(
    'runtime:account-a:delivery-retry',
    'runtime',
    'account-a',
    'order.updated',
    repeat('a', 64),
    300
  );
  if v_result->>'status' <> 'duplicate' then
    raise exception 'completed replay was not deduplicated: %', v_result;
  end if;
  if v_result->'result' <> '{"status":201,"body":{"id":"synthetic-result"}}'::jsonb then
    raise exception 'completed replay did not return the stored response: %', v_result;
  end if;

  if not exists (
    select 1
      from public.processed_webhooks
     where idempotency_key = 'runtime:account-a:delivery-retry'
       and attempts = 2
       and status = 'completed'
       and last_error is null
       and payload_hash = repeat('a', 64)
       and result_payload = '{"status":201,"body":{"id":"synthetic-result"}}'::jsonb
  ) then
    raise exception 'retry observability fields are incorrect';
  end if;

  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public'
       and indexname = 'checkout_signals_merchant_idempotency_key_idx'
  ) then
    raise exception 'checkout-signal atomic idempotency index is missing';
  end if;
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public'
       and indexname = 'support_payout_cases_api_idempotency_key_idx'
  ) then
    raise exception 'case API idempotency index is missing';
  end if;

  -- Distinct deliveries for one source object serialize. After the newer
  -- version completes, an older snapshot becomes an observable ignored row.
  v_result := public.claim_processed_webhook(
    'runtime:account-a:object-old', 'runtime', 'account-a', 'order.updated',
    repeat('1', 64), 300, 'order:42', 100
  );
  if v_result->>'status' <> 'claimed' then
    raise exception 'first object version was not claimed: %', v_result;
  end if;
  v_first_token := (v_result->>'claim_token')::uuid;

  v_result := public.claim_processed_webhook(
    'runtime:account-a:object-new', 'runtime', 'account-a', 'order.updated',
    repeat('2', 64), 300, 'order:42', 200
  );
  if v_result->>'status' <> 'busy' then
    raise exception 'concurrent object version was not deferred: %', v_result;
  end if;

  if not public.complete_processed_webhook(
    'runtime:account-a:object-old', v_first_token, 'completed', null
  ) then
    raise exception 'first object version could not complete';
  end if;

  v_result := public.claim_processed_webhook(
    'runtime:account-a:object-new', 'runtime', 'account-a', 'order.updated',
    repeat('2', 64), 300, 'order:42', 200
  );
  if v_result->>'status' <> 'claimed' then
    raise exception 'deferred newer object version was not reclaimed: %', v_result;
  end if;
  v_retry_token := (v_result->>'claim_token')::uuid;
  if not public.complete_processed_webhook(
    'runtime:account-a:object-new', v_retry_token, 'completed', null
  ) then
    raise exception 'newer object version could not complete';
  end if;

  v_result := public.claim_processed_webhook(
    'runtime:account-a:object-stale', 'runtime', 'account-a', 'order.updated',
    repeat('3', 64), 300, 'order:42', 150
  );
  if v_result->>'status' <> 'stale' then
    raise exception 'older object snapshot was not ignored: %', v_result;
  end if;
  if not exists (
    select 1 from public.processed_webhooks
     where idempotency_key = 'runtime:account-a:object-stale'
       and status = 'ignored'
       and object_key = 'order:42'
       and event_version = 150
  ) then
    raise exception 'ignored stale event was not observable';
  end if;

  -- The same provider delivery identifier is independent across source accounts.
  v_result := public.claim_processed_webhook(
    'runtime:account-a:shared-delivery', 'runtime', 'account-a', 'order.created', repeat('c', 64), 300
  );
  if v_result->>'status' <> 'claimed' then
    raise exception 'account A shared delivery was not claimed: %', v_result;
  end if;
  v_result := public.claim_processed_webhook(
    'runtime:account-b:shared-delivery', 'runtime', 'account-b', 'order.created', repeat('c', 64), 300
  );
  if v_result->>'status' <> 'claimed' then
    raise exception 'account B shared delivery collided with account A: %', v_result;
  end if;

  -- Out-of-order distinct deliveries remain independently observable.
  v_result := public.claim_processed_webhook(
    'runtime:account-a:event-newer', 'runtime', 'account-a', 'order.updated', repeat('d', 64), 300
  );
  if v_result->>'status' <> 'claimed' then
    raise exception 'newer event was not claimed: %', v_result;
  end if;
  v_result := public.claim_processed_webhook(
    'runtime:account-a:event-older', 'runtime', 'account-a', 'order.updated', repeat('e', 64), 300
  );
  if v_result->>'status' <> 'claimed' then
    raise exception 'older distinct event was not claimed: %', v_result;
  end if;

  -- A crashed worker's lease can be reclaimed, but its token is fenced out.
  v_result := public.claim_processed_webhook(
    'runtime:account-a:expired-lease', 'runtime', 'account-a', 'order.updated', repeat('f', 64), 300
  );
  if v_result->>'status' <> 'claimed' then
    raise exception 'lease test delivery was not claimed: %', v_result;
  end if;
  v_expired_token := (v_result->>'claim_token')::uuid;

  update public.processed_webhooks
     set lease_expires_at = now() - interval '1 second'
   where idempotency_key = 'runtime:account-a:expired-lease';

  v_result := public.claim_processed_webhook(
    'runtime:account-a:expired-lease', 'runtime', 'account-a', 'order.updated', repeat('f', 64), 300
  );
  if v_result->>'status' <> 'claimed' then
    raise exception 'expired lease was not reclaimed: %', v_result;
  end if;
  v_reclaimed_token := (v_result->>'claim_token')::uuid;

  if public.complete_processed_webhook(
    'runtime:account-a:expired-lease', v_expired_token, 'completed', null
  ) then
    raise exception 'expired worker completed the reclaimed delivery';
  end if;
  if not public.complete_processed_webhook(
    'runtime:account-a:expired-lease', v_reclaimed_token, 'completed', null
  ) then
    raise exception 'lease-reclaim owner could not complete the delivery';
  end if;
end;
$acceptance$;

rollback;

select 'webhook event safety sequential acceptance passed' as result;
