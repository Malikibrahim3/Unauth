\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values ('d6300000-0000-4000-8000-000000000006','p02-close-repair@example.invalid');
insert into public.merchants(id,name,is_demo) values ('d6310000-0000-4000-8000-000000000006','P02 close reversal fixture',true);
insert into public.merchant_users(merchant_id,user_id,role,invite_status,invited_email) values ('d6310000-0000-4000-8000-000000000006','d6300000-0000-4000-8000-000000000006','owner','active','p02-close-repair@example.invalid');
insert into public.provider_credit_records(id,merchant_id,provider,external_credit_id,amount_minor,currency,credit_type,idempotency_key,observation_authority,observed_at)
values ('d6320000-0000-4000-8000-000000000006','d6310000-0000-4000-8000-000000000006','manual','P02-credit',10000,'GBP','credit','p02-close-credit','source_observed','2026-09-05T12:00:00Z');
insert into public.provider_credit_records(merchant_id,provider,external_credit_id,amount_minor,currency,credit_type,idempotency_key,observation_authority,observed_at,reverses_credit_id)
values ('d6310000-0000-4000-8000-000000000006','manual','P02-reversal',2500,'GBP','reversal','p02-close-reversal','source_observed','2026-09-05T12:30:00Z','d6320000-0000-4000-8000-000000000006');
do $proof$
declare preview jsonb; closed jsonb; replay jsonb; amount bigint;
begin
 preview:=public.financial_period_preview_v1('d6310000-0000-4000-8000-000000000006','2026-08-31T23:00:00Z','2026-09-30T23:00:00Z');
 if (preview#>>'{settlements,0,received_minor}')::bigint<>7500 then raise exception 'Preview expected 7500'; end if;
 closed:=public.close_financial_period('d6310000-0000-4000-8000-000000000006','d6300000-0000-4000-8000-000000000006','2026-09','2026-08-31T23:00:00Z','2026-09-30T23:00:00Z','{}','Disposable reversal proof','p02-close-repair-1');
 select (settlement_snapshot#>>'{currencies,0,observed_minor}')::bigint into amount from public.financial_period_closures where merchant_id='d6310000-0000-4000-8000-000000000006';
 if amount<>7500 then raise exception 'Stored close snapshot expected 7500, got %',amount; end if;
 replay:=public.close_financial_period('d6310000-0000-4000-8000-000000000006','d6300000-0000-4000-8000-000000000006','2026-09','2026-08-31T23:00:00Z','2026-09-30T23:00:00Z','{}','Disposable reversal proof','p02-close-repair-1');
 if replay->>'replayed'<>'true' then raise exception 'Replay not observed'; end if;
 if (select count(*) from public.financial_period_closures where merchant_id='d6310000-0000-4000-8000-000000000006')<>1 then raise exception 'Duplicate close'; end if;
 if (select count(*) from public.domain_events where merchant_id='d6310000-0000-4000-8000-000000000006' and event_type='financial_period.closed')<>1 then raise exception 'Missing or duplicate audit'; end if;
end;
$proof$;
rollback;
do $cleanup$
begin
 if exists(select 1 from public.merchants where id='d6310000-0000-4000-8000-000000000006') or exists(select 1 from auth.users where id='d6300000-0000-4000-8000-000000000006') then raise exception 'Cleanup retained fixture'; end if;
end;
$cleanup$;
