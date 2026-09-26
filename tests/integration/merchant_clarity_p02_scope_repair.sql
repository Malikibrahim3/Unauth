\set ON_ERROR_STOP on
begin;
insert into public.merchants(id,name,is_demo) values ('d6200000-0000-4000-8000-000000000006','P02 disposable scope proof',true);
insert into public.support_payout_cases(id,merchant_id,claim_type,status,detection_method,manual_reference,currency)
values ('d6210000-0000-4000-8000-000000000006','d6200000-0000-4000-8000-000000000006','damaged','pending','manual','P02-SCOPE-REPAIR','GBP');
insert into public.case_exceptions(id,merchant_id,support_payout_case_id,exception_type,confidence,status,title,context,created_at,dedup_key)
select id::uuid,'d6200000-0000-4000-8000-000000000006','d6210000-0000-4000-8000-000000000006','conflicting_financials','probable','open','P02 scope boundary',jsonb_build_object('currency',currency),created::timestamptz,id from (values
 ('d6220000-0000-4000-8000-000000000001','GBP','2026-08-31T22:59:59Z'),
 ('d6220000-0000-4000-8000-000000000002','GBP','2026-08-31T23:00:00Z'),
 ('d6220000-0000-4000-8000-000000000003','USD','2026-09-15T12:00:00Z'),
 ('d6220000-0000-4000-8000-000000000004','GBP','2026-09-30T23:00:00Z')
) fixture(id,currency,created);
do $proof$
declare result jsonb;
begin
 result:=public.reconciliation_page_v2('d6200000-0000-4000-8000-000000000006','open',null,'GBP',null,1,25,'2026-08-31T23:00:00Z','2026-09-30T23:00:00Z');
 if (result->>'total_count')::int<>1 or (result->>'earlier_outstanding_count')::int<>1 then raise exception 'Period/currency boundary failed: %', result; end if;
 result:=public.financial_period_preview_v1('d6200000-0000-4000-8000-000000000006','2026-08-31T23:00:00Z','2026-09-30T23:00:00Z');
 if (result->>'blocker_count')::int<>2 or (result->>'earlier_outstanding_count')::int<>1 then raise exception 'Preview population failed: %', result; end if;
 result:=public.reconciliation_page_v2('d6290000-0000-4000-8000-000000000006','all');
 if (result->>'total_count')::int<>0 then raise exception 'Tenant separation failed'; end if;
 if has_function_privilege('authenticated','public.financial_period_preview_v1(uuid,timestamptz,timestamptz)','EXECUTE') then raise exception 'Authenticated direct RPC access must be denied'; end if;
 begin
  perform public.financial_period_preview_v1('d6200000-0000-4000-8000-000000000006','2026-09-30','2026-09-01');
  raise exception 'Invalid period accepted';
 exception when invalid_parameter_value then null;
 end;
end;
$proof$;
rollback;
do $cleanup$
begin
 if exists(select 1 from public.merchants where id='d6200000-0000-4000-8000-000000000006') or exists(select 1 from public.case_exceptions where merchant_id='d6200000-0000-4000-8000-000000000006') then raise exception 'Fixture cleanup failed'; end if;
end;
$cleanup$;
