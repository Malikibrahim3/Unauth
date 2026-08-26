-- Distinctive analytics read models.
--
-- These functions are additive, read-only, merchant scoped and callable only
-- by the service role. They return provenance with every payload, keep money
-- separated by currency, use null for unavailable financial observations, and
-- never infer event time from mutable updated_at columns.

begin;

create or replace function public._distinctive_analytics_assert_scope(
  p_merchant_id uuid,
  p_actor_id uuid,
  p_range text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_timezone text,
  p_currency text,
  p_comparison text,
  p_as_of timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_currency text := nullif(upper(trim(p_currency)), '');
begin
  if p_merchant_id is null or p_actor_id is null then
    raise exception 'analytics_scope_identity_required';
  end if;

  if not exists (
    select 1
      from public.merchant_users mu
     where mu.merchant_id = p_merchant_id
       and mu.user_id = p_actor_id
       and mu.invite_status::text = 'active'
  ) then
    raise exception 'analytics_scope_membership_required';
  end if;

  if p_range not in ('7d', '30d', '90d', '12m', 'custom') then
    raise exception 'analytics_scope_invalid_range';
  end if;
  if p_comparison not in ('none', 'previous_period', 'previous_year') then
    raise exception 'analytics_scope_invalid_comparison';
  end if;
  if p_start_at is null or p_end_at is null or p_as_of is null or p_end_at <= p_start_at then
    raise exception 'analytics_scope_invalid_bounds';
  end if;
  if p_end_at - p_start_at > interval '366 days' then
    raise exception 'analytics_scope_range_too_large';
  end if;
  if p_end_at > p_as_of + interval '1 second' then
    raise exception 'analytics_scope_future_end';
  end if;
  if p_as_of < now() - interval '15 minutes' or p_as_of > now() + interval '1 minute' then
    raise exception 'analytics_scope_stale_as_of';
  end if;
  if p_timezone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = p_timezone
  ) then
    raise exception 'analytics_scope_invalid_timezone';
  end if;
  if v_currency is not null and v_currency !~ '^[A-Z]{3}$' then
    raise exception 'analytics_scope_invalid_currency';
  end if;

  return jsonb_build_object(
    'range', p_range,
    'start', p_start_at,
    'end', p_end_at,
    'timezone', p_timezone,
    'currency', v_currency,
    'comparison', p_comparison,
    'asOf', p_as_of
  );
end
$function$;

create or replace function public._distinctive_analytics_envelope(
  p_data jsonb,
  p_generated_at timestamptz,
  p_source_watermark timestamptz,
  p_completeness text,
  p_issues jsonb,
  p_record_count bigint,
  p_currencies text[]
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if p_completeness not in ('complete', 'partial', 'missing', 'unavailable') then
    raise exception 'analytics_invalid_completeness';
  end if;
  return jsonb_build_object(
    'data', coalesce(p_data, '{}'::jsonb),
    'generatedAt', p_generated_at,
    'sourceDataWatermark', p_source_watermark,
    'completeness', p_completeness,
    'issues', coalesce(p_issues, '[]'::jsonb),
    'recordCount', greatest(coalesce(p_record_count, 0), 0),
    'currencies', to_jsonb(coalesce(p_currencies, array[]::text[]))
  );
end
$function$;

create or replace function public.get_financial_analytics(
  p_merchant_id uuid, p_actor_id uuid, p_range text,
  p_start_at timestamptz, p_end_at timestamptz, p_timezone text,
  p_currency text default null, p_comparison text default 'none',
  p_as_of timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_scope jsonb;
  v_series jsonb;
  v_count bigint;
  v_excluded bigint;
  v_watermark timestamptz;
  v_currencies text[];
  v_issues jsonb := '[]'::jsonb;
  v_completeness text;
  v_currency text := nullif(upper(trim(p_currency)), '');
begin
  v_scope := public._distinctive_analytics_assert_scope(p_merchant_id, p_actor_id, p_range, p_start_at, p_end_at, p_timezone, p_currency, p_comparison, p_as_of);

  select count(*), max(recorded_at), array_agg(distinct trim(currency::text) order by trim(currency::text))
    into v_count, v_watermark, v_currencies
    from public.case_financial_entries
   where merchant_id = p_merchant_id
     and effective_at >= p_start_at and effective_at < p_end_at
     and recorded_at <= p_as_of
     and (v_currency is null or trim(currency::text) = v_currency);

  with days as (
    select generate_series(
      (p_start_at at time zone p_timezone)::date,
      ((p_end_at - interval '1 microsecond') at time zone p_timezone)::date,
      interval '1 day'
    )::date as day
  ), currencies as (
    select unnest(case when coalesce(array_length(v_currencies, 1), 0) = 0 and v_currency is not null then array[v_currency] else coalesce(v_currencies, array[]::text[]) end) as currency
  ), measures(measure) as (
    values ('requested'), ('exposed'), ('approved'), ('paid'), ('estimated_loss'),
      ('confirmed_loss'), ('recoverable'), ('recovered'), ('prevented'), ('written_off')
  ), aggregate_values as (
    select (effective_at at time zone p_timezone)::date as day,
           trim(currency::text) as currency,
           state as measure,
           sum(case when reverses_entry_id is null then amount_minor else -amount_minor end)::numeric as value,
           count(*) as records
      from public.case_financial_entries
     where merchant_id = p_merchant_id
       and effective_at >= p_start_at and effective_at < p_end_at
       and recorded_at <= p_as_of
       and (v_currency is null or trim(currency::text) = v_currency)
     group by 1, 2, 3
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', d.day::text || ':' || c.currency || ':' || m.measure,
    'label', d.day::text,
    'start', (d.day::timestamp at time zone p_timezone),
    'end', ((d.day + 1)::timestamp at time zone p_timezone),
    'measure', m.measure,
    'currency', c.currency,
    'value', a.value,
    'quality', case when a.records is null then 'missing' else 'known' end,
    'records', jsonb_build_object(
      'href', format(
        '/financials/reports/records?kind=financial-entry&measure=%s&range=custom&timezone=%s&currency=%s&from=%s&to=%s&asOf=%s',
        m.measure,
        replace(p_timezone, '+', '%2B'),
        c.currency,
        to_char(
          (d.day::timestamp at time zone p_timezone) at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        ),
        to_char(
          ((d.day + 1)::timestamp at time zone p_timezone) at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        ),
        to_char(p_as_of at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ),
      'label', 'View supporting entries'
    )
  ) order by d.day, c.currency, m.measure), '[]'::jsonb)
    into v_series
    from days d cross join currencies c cross join measures m
    left join aggregate_values a on a.day = d.day and a.currency = c.currency and a.measure = m.measure;

  if v_currency is null and coalesce(array_length(v_currencies, 1), 0) > 1 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'MULTIPLE_CURRENCIES_SPLIT', 'explanation', 'Values are returned as separate currency series and are never summed together.',
      'affectedMeasures', array['all'], 'excludedRecordCount', 0
    ));
  elsif v_currency is not null then
    select count(*) into v_excluded from public.case_financial_entries
     where merchant_id = p_merchant_id and effective_at >= p_start_at and effective_at < p_end_at
       and recorded_at <= p_as_of and trim(currency::text) <> v_currency;
    if v_excluded > 0 then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code', 'CURRENCY_SCOPE_APPLIED', 'explanation', 'Records in other currencies are excluded from this currency-specific view.',
        'affectedMeasures', array['all'], 'excludedRecordCount', v_excluded
      ));
    end if;
  end if;
  if p_comparison <> 'none' then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'COMPARISON_SERIES_UNAVAILABLE', 'explanation', 'The current-period series is available; a comparable immutable prior-period series is not returned by this read model yet.',
      'affectedMeasures', array['all'], 'excludedRecordCount', 0
    ));
  end if;
  if exists (
    select 1
      from public.case_financial_entries
     where merchant_id = p_merchant_id
       and effective_at >= p_start_at and effective_at < p_end_at
       and recorded_at > p_as_of
       and (v_currency is null or trim(currency::text) = v_currency)
  ) then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'AS_OF_BOUNDARY_APPLIED', 'explanation', 'Entries recorded after the stable read boundary are excluded from this result.',
      'affectedMeasures', array['all'], 'excludedRecordCount', (
        select count(*) from public.case_financial_entries
         where merchant_id = p_merchant_id
           and effective_at >= p_start_at and effective_at < p_end_at
           and recorded_at > p_as_of
           and (v_currency is null or trim(currency::text) = v_currency)
      )
    ));
  end if;

  v_completeness := case
    when v_count = 0 then 'missing'
    when p_comparison <> 'none' then 'partial'
    when exists (
      select 1 from public.case_financial_entries
       where merchant_id = p_merchant_id
         and effective_at >= p_start_at and effective_at < p_end_at
         and recorded_at > p_as_of
         and (v_currency is null or trim(currency::text) = v_currency)
    ) then 'partial'
    else 'complete'
  end;
  if v_count = 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'NO_FINANCIAL_HISTORY', 'explanation', 'No immutable financial entries exist in this scope; absent stages remain unavailable rather than zero.',
      'affectedMeasures', array['all'], 'excludedRecordCount', 0
    ));
  end if;

  return public._distinctive_analytics_envelope(
    jsonb_build_object('series', v_series, 'drilldownRoute', '/financials/reports/records'),
    p_as_of, v_watermark, v_completeness, v_issues, v_count, v_currencies
  );
end
$function$;

create or replace function public.get_work_analytics(
  p_merchant_id uuid, p_actor_id uuid, p_range text,
  p_start_at timestamptz, p_end_at timestamptz, p_timezone text,
  p_currency text default null, p_comparison text default 'none',
  p_as_of timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_scope jsonb;
  v_flow jsonb;
  v_due_bands jsonb;
  v_count bigint;
  v_watermark timestamptz;
  v_issues jsonb := '[]'::jsonb;
  v_completeness text := 'complete';
begin
  v_scope := public._distinctive_analytics_assert_scope(p_merchant_id, p_actor_id, p_range, p_start_at, p_end_at, p_timezone, p_currency, p_comparison, p_as_of);

  with events as (
    select id, created_at as occurred_at, 'created'::text as measure from public.work_tasks
     where merchant_id = p_merchant_id and created_at >= p_start_at and created_at < p_end_at and created_at <= p_as_of
    union all
    select id, completed_at, 'completed'::text from public.work_tasks
     where merchant_id = p_merchant_id and completed_at >= p_start_at and completed_at < p_end_at and completed_at <= p_as_of
  )
  select count(distinct id), max(occurred_at) into v_count, v_watermark from events;

  with days as (
    select generate_series((p_start_at at time zone p_timezone)::date, ((p_end_at - interval '1 microsecond') at time zone p_timezone)::date, interval '1 day')::date as day
  ), measures(measure) as (values ('created'), ('completed')),
  events as (
    select created_at as occurred_at, 'created'::text as measure from public.work_tasks
     where merchant_id = p_merchant_id and created_at >= p_start_at and created_at < p_end_at and created_at <= p_as_of
    union all
    select completed_at, 'completed'::text from public.work_tasks
     where merchant_id = p_merchant_id and completed_at >= p_start_at and completed_at < p_end_at and completed_at <= p_as_of
  ), aggregate_values as (
    select (occurred_at at time zone p_timezone)::date as day, measure, count(*)::numeric as value
      from events group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', d.day::text || ':' || m.measure, 'label', d.day::text,
    'start', (d.day::timestamp at time zone p_timezone), 'end', ((d.day + 1)::timestamp at time zone p_timezone),
    'measure', m.measure, 'value', coalesce(a.value, 0), 'quality', 'known',
    'records', jsonb_build_object('href', format('/work?range=%s&timezone=%s&event=%s&date=%s', p_range, p_timezone, m.measure, d.day), 'label', 'View queue records')
  ) order by d.day, m.measure), '[]'::jsonb) into v_flow
  from days d cross join measures m left join aggregate_values a on a.day = d.day and a.measure = m.measure;

  with bands(band, label, ordinal) as (
    values ('overdue', 'Overdue', 1), ('due_7d', 'Due in 7 days', 2), ('later', 'Due later', 3), ('no_due_date', 'No due date', 4)
  ), open_tasks as (
    select case when due_at is null then 'no_due_date' when due_at < p_as_of then 'overdue'
      when due_at < p_as_of + interval '7 days' then 'due_7d' else 'later' end as band
    from public.work_tasks
    where merchant_id = p_merchant_id and created_at < p_end_at and created_at <= p_as_of
      and status not in ('completed', 'resolved', 'dismissed', 'cancelled')
  ), counts as (select band, count(*)::numeric as value from open_tasks group by band)
  select jsonb_agg(jsonb_build_object(
    'rowKey', b.band, 'rowLabel', b.label, 'columnKey', 'open_tasks', 'columnLabel', 'Open tasks',
    'value', coalesce(c.value, 0), 'quality', 'known',
    'records', jsonb_build_object('href', format('/work?due=%s', b.band), 'label', 'View queue records')
  ) order by b.ordinal) into v_due_bands from bands b left join counts c on c.band = b.band;

  if p_comparison <> 'none' then
    v_completeness := 'partial';
    v_issues := jsonb_build_array(jsonb_build_object(
      'code', 'COMPARISON_SERIES_UNAVAILABLE', 'explanation', 'Current stock and flow are available; prior-period task state cannot be reconstructed from mutable task rows.',
      'affectedMeasures', array['created', 'completed', 'due_bands'], 'excludedRecordCount', 0
    ));
  end if;
  return public._distinctive_analytics_envelope(
    jsonb_build_object('flow', v_flow, 'dueBands', v_due_bands, 'drilldownRoute', '/work'),
    p_as_of, v_watermark, v_completeness, v_issues, v_count, array[]::text[]
  );
end
$function$;

create or replace function public.get_financial_analytics_records(
  p_merchant_id uuid,
  p_actor_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_timezone text,
  p_currency text,
  p_measure text,
  p_as_of timestamptz default now(),
  p_limit integer default 50,
  p_offset integer default 0
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_scope jsonb;
  v_records jsonb;
  v_count bigint;
  v_signed_total numeric;
  v_watermark timestamptz;
  v_currency text := nullif(upper(trim(p_currency)), '');
begin
  v_scope := public._distinctive_analytics_assert_scope(
    p_merchant_id, p_actor_id, 'custom', p_start_at, p_end_at,
    p_timezone, p_currency, 'none', p_as_of
  );
  if p_measure not in (
    'requested', 'exposed', 'approved', 'paid', 'estimated_loss',
    'confirmed_loss', 'recoverable', 'recovered', 'prevented', 'written_off'
  ) then
    raise exception 'analytics_records_invalid_measure';
  end if;
  if v_currency is null then
    raise exception 'analytics_records_currency_required';
  end if;
  if p_limit < 1 or p_limit > 100 or p_offset < 0 then
    raise exception 'analytics_records_invalid_pagination';
  end if;

  select count(*), coalesce(sum(case when reverses_entry_id is null then amount_minor else -amount_minor end), 0), max(recorded_at)
    into v_count, v_signed_total, v_watermark
    from public.case_financial_entries
   where merchant_id = p_merchant_id
     and state = p_measure
     and trim(currency::text) = v_currency
     and effective_at >= p_start_at and effective_at < p_end_at
     and recorded_at <= p_as_of;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'caseId', support_payout_case_id,
    'lossId', loss_case_id,
    'recoveryId', recovery_case_id,
    'state', state,
    'amountMinor', case when reverses_entry_id is null then amount_minor else -amount_minor end,
    'currency', trim(currency::text),
    'effectiveAt', effective_at,
    'recordedAt', recorded_at,
    'reversesEntryId', reverses_entry_id
  ) order by effective_at desc, id desc), '[]'::jsonb)
    into v_records
    from (
      select id, support_payout_case_id, loss_case_id, recovery_case_id, state,
        amount_minor, currency, effective_at, recorded_at, reverses_entry_id
      from public.case_financial_entries
      where merchant_id = p_merchant_id
        and state = p_measure
        and trim(currency::text) = v_currency
        and effective_at >= p_start_at and effective_at < p_end_at
        and recorded_at <= p_as_of
      order by effective_at desc, id desc
      limit p_limit offset p_offset
    ) scoped;

  return public._distinctive_analytics_envelope(
    jsonb_build_object(
      'records', v_records,
      'totalCount', v_count,
      'signedTotalMinor', v_signed_total,
      'measure', p_measure,
      'start', p_start_at,
      'end', p_end_at,
      'currency', v_currency
    ),
    p_as_of, v_watermark,
    case when v_count = 0 then 'missing' else 'complete' end,
    case when v_count = 0 then jsonb_build_array(jsonb_build_object(
      'code', 'NO_FINANCIAL_ENTRIES',
      'explanation', 'No immutable ledger entries match this chart cell.',
      'affectedMeasures', array[p_measure],
      'excludedRecordCount', 0
    )) else '[]'::jsonb end,
    v_count, array[v_currency]
  );
end
$function$;

create or replace function public.get_recovery_analytics(
  p_merchant_id uuid, p_actor_id uuid, p_range text,
  p_start_at timestamptz, p_end_at timestamptz, p_timezone text,
  p_currency text default null, p_comparison text default 'none',
  p_as_of timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_scope jsonb;
  v_value_series jsonb;
  v_stage_series jsonb;
  v_financial_count bigint;
  v_event_count bigint;
  v_financial_watermark timestamptz;
  v_event_watermark timestamptz;
  v_currencies text[];
  v_issues jsonb := '[]'::jsonb;
  v_completeness text;
  v_currency text := nullif(upper(trim(p_currency)), '');
begin
  v_scope := public._distinctive_analytics_assert_scope(p_merchant_id, p_actor_id, p_range, p_start_at, p_end_at, p_timezone, p_currency, p_comparison, p_as_of);
  select count(*), max(recorded_at), array_agg(distinct trim(currency::text) order by trim(currency::text))
    into v_financial_count, v_financial_watermark, v_currencies
    from public.case_financial_entries
   where merchant_id = p_merchant_id and state in ('recoverable', 'recovered', 'written_off')
     and effective_at >= p_start_at and effective_at < p_end_at and recorded_at <= p_as_of
     and (v_currency is null or trim(currency::text) = v_currency);
  select count(*), max(created_at) into v_event_count, v_event_watermark
    from public.recovery_case_events
   where merchant_id = p_merchant_id and created_at >= p_start_at and created_at < p_end_at and created_at <= p_as_of;

  with days as (
    select generate_series((p_start_at at time zone p_timezone)::date, ((p_end_at - interval '1 microsecond') at time zone p_timezone)::date, interval '1 day')::date as day
  ), currencies as (
    select unnest(case when coalesce(array_length(v_currencies, 1), 0) = 0 and v_currency is not null then array[v_currency] else coalesce(v_currencies, array[]::text[]) end) as currency
  ), measures(measure) as (values ('recoverable'), ('recovered'), ('written_off')),
  aggregate_values as (
    select (effective_at at time zone p_timezone)::date as day, trim(currency::text) as currency, state as measure,
      sum(case when reverses_entry_id is null then amount_minor else -amount_minor end)::numeric as value, count(*) as records
    from public.case_financial_entries
    where merchant_id = p_merchant_id and state in ('recoverable', 'recovered', 'written_off')
      and effective_at >= p_start_at and effective_at < p_end_at and recorded_at <= p_as_of
      and (v_currency is null or trim(currency::text) = v_currency)
    group by 1, 2, 3
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', d.day::text || ':' || c.currency || ':' || m.measure, 'label', d.day::text,
    'start', (d.day::timestamp at time zone p_timezone), 'end', ((d.day + 1)::timestamp at time zone p_timezone),
    'measure', m.measure, 'currency', c.currency, 'value', a.value,
    'quality', case when a.records is null then 'missing' else 'known' end,
    'records', jsonb_build_object('href', format('/financials/recovery?stage=%s&currency=%s&date=%s', m.measure, c.currency, d.day), 'label', 'View recovery records')
  ) order by d.day, c.currency, m.measure), '[]'::jsonb) into v_value_series
  from days d cross join currencies c cross join measures m left join aggregate_values a on a.day = d.day and a.currency = c.currency and a.measure = m.measure;

  with aggregate_values as (
    select (created_at at time zone p_timezone)::date as day, event_type::text as measure, count(*)::numeric as value
    from public.recovery_case_events
    where merchant_id = p_merchant_id and created_at >= p_start_at and created_at < p_end_at and created_at <= p_as_of
    group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', day::text || ':' || measure, 'label', day::text,
    'start', (day::timestamp at time zone p_timezone), 'end', ((day + 1)::timestamp at time zone p_timezone),
    'measure', measure, 'value', value, 'quality', 'known',
    'records', jsonb_build_object('href', format('/financials/recovery?event=%s&date=%s', measure, day), 'label', 'View recovery records')
  ) order by day, measure), '[]'::jsonb) into v_stage_series from aggregate_values;

  if v_financial_count = 0 and v_event_count > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'RECOVERY_VALUE_HISTORY_UNAVAILABLE', 'explanation', 'Recovery events exist, but no immutable recovery-value entries exist in this scope.',
      'affectedMeasures', array['recoverable', 'recovered', 'written_off'], 'excludedRecordCount', 0
    ));
  end if;
  if v_currency is null and coalesce(array_length(v_currencies, 1), 0) > 1 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'MULTIPLE_CURRENCIES_SPLIT', 'explanation', 'Recovery values are returned as separate currency series.',
      'affectedMeasures', array['recoverable', 'recovered', 'written_off'], 'excludedRecordCount', 0
    ));
  end if;
  if p_comparison <> 'none' then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'COMPARISON_SERIES_UNAVAILABLE', 'explanation', 'A prior-period recovery comparison is not returned by this read model yet.',
      'affectedMeasures', array['all'], 'excludedRecordCount', 0
    ));
  end if;
  v_completeness := case when v_financial_count + v_event_count = 0 then 'missing'
    when v_financial_count = 0 or p_comparison <> 'none' then 'partial' else 'complete' end;
  if v_financial_count + v_event_count = 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'NO_RECOVERY_HISTORY', 'explanation', 'No append-only recovery history exists in this scope.',
      'affectedMeasures', array['all'], 'excludedRecordCount', 0
    ));
  end if;
  return public._distinctive_analytics_envelope(
    jsonb_build_object('valueSeries', v_value_series, 'stageSeries', v_stage_series, 'drilldownRoute', '/financials/recovery'),
    p_as_of, greatest(v_financial_watermark, v_event_watermark), v_completeness, v_issues,
    v_financial_count + v_event_count, v_currencies
  );
end
$function$;

create or replace function public.get_evidence_analytics(
  p_merchant_id uuid, p_actor_id uuid, p_range text,
  p_start_at timestamptz, p_end_at timestamptz, p_timezone text,
  p_currency text default null, p_comparison text default 'none',
  p_as_of timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_scope jsonb;
  v_readiness jsonb;
  v_missing jsonb;
  v_count bigint;
  v_watermark timestamptz;
  v_issues jsonb := '[]'::jsonb;
  v_completeness text;
begin
  v_scope := public._distinctive_analytics_assert_scope(p_merchant_id, p_actor_id, p_range, p_start_at, p_end_at, p_timezone, p_currency, p_comparison, p_as_of);
  select count(*), max(generated_at) into v_count, v_watermark
    from public.case_recommendation_snapshots
   where merchant_id = p_merchant_id and generated_at >= p_start_at and generated_at < p_end_at and generated_at <= p_as_of;

  with counts as (
    select recommendation_type, assessment_state, count(*)::numeric as value
    from public.case_recommendation_snapshots
    where merchant_id = p_merchant_id and generated_at >= p_start_at and generated_at < p_end_at and generated_at <= p_as_of
    group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rowKey', recommendation_type, 'rowLabel', initcap(replace(recommendation_type, '_', ' ')),
    'columnKey', assessment_state, 'columnLabel', initcap(replace(assessment_state, '_', ' ')),
    'value', value, 'quality', 'known',
    'records', jsonb_build_object('href', format('/cases?recommendationType=%s&assessment=%s', recommendation_type, assessment_state), 'label', 'View supporting cases')
  ) order by recommendation_type, assessment_state), '[]'::jsonb) into v_readiness from counts;

  with gaps as (
    select gap, count(*)::numeric as value
    from public.case_recommendation_snapshots s cross join lateral unnest(s.missing_evidence) gap
    where s.merchant_id = p_merchant_id and s.generated_at >= p_start_at and s.generated_at < p_end_at and s.generated_at <= p_as_of
    group by gap
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rowKey', encode(convert_to(gap, 'UTF8'), 'hex'), 'rowLabel', gap,
    'columnKey', 'blocked_cases', 'columnLabel', 'Blocked recommendations',
    'value', value, 'quality', 'known',
    'records', jsonb_build_object('href', '/cases?evidenceGapHex=' || encode(convert_to(gap, 'UTF8'), 'hex'), 'label', 'View blocked cases')
  ) order by value desc, gap), '[]'::jsonb) into v_missing from gaps;

  if p_comparison <> 'none' then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'COMPARISON_SERIES_UNAVAILABLE', 'explanation', 'A prior-period evidence-readiness comparison is not returned by this read model yet.',
      'affectedMeasures', array['readiness', 'missing_evidence'], 'excludedRecordCount', 0
    ));
  end if;
  v_completeness := case when v_count = 0 then 'missing' when p_comparison <> 'none' then 'partial' else 'complete' end;
  if v_count = 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'NO_RECOMMENDATION_HISTORY', 'explanation', 'No immutable recommendation snapshots exist in this scope.',
      'affectedMeasures', array['readiness', 'missing_evidence'], 'excludedRecordCount', 0
    ));
  end if;
  return public._distinctive_analytics_envelope(
    jsonb_build_object('readiness', v_readiness, 'missingEvidence', v_missing, 'drilldownRoute', '/cases'),
    p_as_of, v_watermark, v_completeness, v_issues, v_count, array[]::text[]
  );
end
$function$;

create or replace function public.get_source_health_analytics(
  p_merchant_id uuid, p_actor_id uuid, p_range text,
  p_start_at timestamptz, p_end_at timestamptz, p_timezone text,
  p_currency text default null, p_comparison text default 'none',
  p_as_of timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_scope jsonb;
  v_event_series jsonb;
  v_source_matrix jsonb;
  v_event_count bigint;
  v_source_count bigint;
  v_event_watermark timestamptz;
  v_source_watermark timestamptz;
  v_issues jsonb := '[]'::jsonb;
  v_completeness text;
begin
  v_scope := public._distinctive_analytics_assert_scope(p_merchant_id, p_actor_id, p_range, p_start_at, p_end_at, p_timezone, p_currency, p_comparison, p_as_of);
  select count(*), max(received_at) into v_event_count, v_event_watermark
    from public.ingestion_events
   where merchant_id = p_merchant_id and received_at >= p_start_at and received_at < p_end_at and received_at <= p_as_of;
  select count(*), max(greatest(data_fresh_through, last_verified_at, last_successful_sync_at))
    into v_source_count, v_source_watermark
    from public.merchant_integrations
   where merchant_id = p_merchant_id and created_at <= p_as_of;

  with counts as (
    select (received_at at time zone p_timezone)::date as day, status as measure, count(*)::numeric as value
    from public.ingestion_events
    where merchant_id = p_merchant_id and received_at >= p_start_at and received_at < p_end_at and received_at <= p_as_of
    group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', day::text || ':' || measure, 'label', day::text,
    'start', (day::timestamp at time zone p_timezone), 'end', ((day + 1)::timestamp at time zone p_timezone),
    'measure', measure, 'value', value, 'quality', 'known',
    'records', jsonb_build_object('href', format('/sources/connected?ingestionStatus=%s&date=%s', measure, day), 'label', 'View ingestion records')
  ) order by day, measure), '[]'::jsonb) into v_event_series from counts;

  select coalesce(jsonb_agg(jsonb_build_object(
    'rowKey', provider_id, 'rowLabel', coalesce(display_name, provider_id),
    'columnKey', status, 'columnLabel', initcap(replace(status, '_', ' ')),
    'value', imported_record_count::numeric, 'quality', case when data_fresh_through is null then 'partial' else 'known' end,
    'records', jsonb_build_object('href', format('/sources/connected?provider=%s', provider_id), 'label', 'View source')
  ) order by category, provider_id), '[]'::jsonb) into v_source_matrix
  from public.merchant_integrations where merchant_id = p_merchant_id and created_at <= p_as_of;

  if v_source_count > 0 and v_event_count = 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'NO_INGESTION_HISTORY_IN_SCOPE', 'explanation', 'Connected-source state is available, but no ingestion events exist in this range.',
      'affectedMeasures', array['event_series'], 'excludedRecordCount', 0
    ));
  end if;
  if exists (select 1 from public.merchant_integrations where merchant_id = p_merchant_id and created_at <= p_as_of and data_fresh_through is null) then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'SOURCE_WATERMARK_PARTIAL', 'explanation', 'At least one connected source does not expose a verified data-fresh-through watermark.',
      'affectedMeasures', array['source_matrix'], 'excludedRecordCount', 0
    ));
  end if;
  if p_comparison <> 'none' then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'COMPARISON_SERIES_UNAVAILABLE', 'explanation', 'Current source health is available; historical connector state is not reconstructed from mutable integration rows.',
      'affectedMeasures', array['source_matrix'], 'excludedRecordCount', 0
    ));
  end if;
  v_completeness := case when v_source_count + v_event_count = 0 then 'missing'
    when v_event_count = 0 or jsonb_array_length(v_issues) > 0 then 'partial' else 'complete' end;
  if v_source_count + v_event_count = 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'NO_SOURCE_HISTORY', 'explanation', 'No source connection or ingestion history exists for this merchant scope.',
      'affectedMeasures', array['all'], 'excludedRecordCount', 0
    ));
  end if;
  return public._distinctive_analytics_envelope(
    jsonb_build_object('eventSeries', v_event_series, 'sourceMatrix', v_source_matrix, 'drilldownRoute', '/sources/connected'),
    p_as_of, greatest(v_event_watermark, v_source_watermark), v_completeness, v_issues,
    v_event_count + v_source_count, array[]::text[]
  );
end
$function$;

create or replace function public.get_automation_analytics(
  p_merchant_id uuid, p_actor_id uuid, p_range text,
  p_start_at timestamptz, p_end_at timestamptz, p_timezone text,
  p_currency text default null, p_comparison text default 'none',
  p_as_of timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_scope jsonb;
  v_rule_series jsonb;
  v_run_series jsonb;
  v_rule_count bigint;
  v_run_count bigint;
  v_rule_watermark timestamptz;
  v_run_watermark timestamptz;
  v_issues jsonb := '[]'::jsonb;
  v_completeness text;
begin
  v_scope := public._distinctive_analytics_assert_scope(p_merchant_id, p_actor_id, p_range, p_start_at, p_end_at, p_timezone, p_currency, p_comparison, p_as_of);
  select count(*), max(evaluated_at) into v_rule_count, v_rule_watermark
    from public.rule_evaluations
   where merchant_id = p_merchant_id and evaluated_at >= p_start_at and evaluated_at < p_end_at and evaluated_at <= p_as_of;
  select count(*), max(greatest(started_at, completed_at)) into v_run_count, v_run_watermark
    from public.workflow_runs
   where merchant_id = p_merchant_id and started_at >= p_start_at and started_at < p_end_at and started_at <= p_as_of;

  with counts as (
    select (evaluated_at at time zone p_timezone)::date as day, coalesce(recommendation, 'unavailable') as measure, count(*)::numeric as value
    from public.rule_evaluations
    where merchant_id = p_merchant_id and evaluated_at >= p_start_at and evaluated_at < p_end_at and evaluated_at <= p_as_of
    group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', day::text || ':' || measure, 'label', day::text,
    'start', (day::timestamp at time zone p_timezone), 'end', ((day + 1)::timestamp at time zone p_timezone),
    'measure', measure, 'value', value, 'quality', case when measure = 'unavailable' then 'partial' else 'known' end,
    'records', jsonb_build_object('href', format('/controls/rules?recommendation=%s&date=%s', measure, day), 'label', 'View rule evaluations')
  ) order by day, measure), '[]'::jsonb) into v_rule_series from counts;

  with counts as (
    select (started_at at time zone p_timezone)::date as day, status as measure, count(*)::numeric as value
    from public.workflow_runs
    where merchant_id = p_merchant_id and started_at >= p_start_at and started_at < p_end_at and started_at <= p_as_of
    group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', day::text || ':' || measure, 'label', day::text,
    'start', (day::timestamp at time zone p_timezone), 'end', ((day + 1)::timestamp at time zone p_timezone),
    'measure', measure, 'value', value, 'quality', 'known',
    'records', jsonb_build_object('href', format('/controls/flows/runs?status=%s&date=%s', measure, day), 'label', 'View workflow runs')
  ) order by day, measure), '[]'::jsonb) into v_run_series from counts;

  if v_rule_count = 0 and v_run_count > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'NO_RULE_EVALUATION_HISTORY', 'explanation', 'Workflow run history exists, but no rule evaluations exist in this scope.',
      'affectedMeasures', array['rule_series'], 'excludedRecordCount', 0
    ));
  elsif v_run_count = 0 and v_rule_count > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'NO_WORKFLOW_RUN_HISTORY', 'explanation', 'Rule evaluation history exists, but no workflow runs exist in this scope.',
      'affectedMeasures', array['run_series'], 'excludedRecordCount', 0
    ));
  end if;
  if p_comparison <> 'none' then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'COMPARISON_SERIES_UNAVAILABLE', 'explanation', 'A prior-period automation comparison is not returned by this read model yet.',
      'affectedMeasures', array['rule_series', 'run_series'], 'excludedRecordCount', 0
    ));
  end if;
  v_completeness := case when v_rule_count + v_run_count = 0 then 'missing'
    when v_rule_count = 0 or v_run_count = 0 or p_comparison <> 'none' then 'partial' else 'complete' end;
  if v_rule_count + v_run_count = 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'NO_AUTOMATION_HISTORY', 'explanation', 'No rule evaluation or workflow run history exists in this scope.',
      'affectedMeasures', array['rule_series', 'run_series'], 'excludedRecordCount', 0
    ));
  end if;
  return public._distinctive_analytics_envelope(
    jsonb_build_object('ruleSeries', v_rule_series, 'runSeries', v_run_series, 'drilldownRoute', '/controls'),
    p_as_of, greatest(v_rule_watermark, v_run_watermark), v_completeness, v_issues,
    v_rule_count + v_run_count, array[]::text[]
  );
end
$function$;

revoke all on function public._distinctive_analytics_assert_scope(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public._distinctive_analytics_envelope(jsonb, timestamptz, timestamptz, text, jsonb, bigint, text[]) from public, anon, authenticated;
revoke all on function public.get_financial_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_work_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_financial_analytics_records(uuid, uuid, timestamptz, timestamptz, text, text, text, timestamptz, integer, integer) from public, anon, authenticated;
revoke all on function public.get_recovery_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_evidence_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_source_health_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_automation_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) from public, anon, authenticated;

grant execute on function public._distinctive_analytics_assert_scope(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) to service_role;
grant execute on function public._distinctive_analytics_envelope(jsonb, timestamptz, timestamptz, text, jsonb, bigint, text[]) to service_role;
grant execute on function public.get_financial_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) to service_role;
grant execute on function public.get_work_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) to service_role;
grant execute on function public.get_financial_analytics_records(uuid, uuid, timestamptz, timestamptz, text, text, text, timestamptz, integer, integer) to service_role;
grant execute on function public.get_recovery_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) to service_role;
grant execute on function public.get_evidence_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) to service_role;
grant execute on function public.get_source_health_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) to service_role;
grant execute on function public.get_automation_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) to service_role;

comment on function public.get_financial_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) is 'Service-role-only, merchant-scoped immutable financial analytics with currency separation and provenance.';
comment on function public.get_work_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) is 'Service-role-only task stock/flow analytics; never reconstructs historical task state from updated_at.';
comment on function public.get_financial_analytics_records(uuid, uuid, timestamptz, timestamptz, text, text, text, timestamptz, integer, integer) is 'Exact immutable-entry drill-down for a financial analytics chart cell.';
comment on function public.get_recovery_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) is 'Service-role-only recovery event and immutable value analytics.';
comment on function public.get_evidence_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) is 'Service-role-only recommendation snapshot readiness and evidence-gap analytics.';
comment on function public.get_source_health_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) is 'Service-role-only ingestion and current source-watermark analytics.';
comment on function public.get_automation_analytics(uuid, uuid, text, timestamptz, timestamptz, text, text, text, timestamptz) is 'Service-role-only rule evaluation and workflow run analytics.';

commit;
