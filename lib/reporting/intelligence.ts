import { TABLES } from '@/lib/supabase/tables';
import { normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { label } from '@/lib/ui/labels';
import { now, nowMs } from '@/lib/time/clock';
import {
  ACTIVE_CANONICAL_CLAIM_STATUSES,
  normalizeLegacyClaimStatus,
} from '@/lib/claims/statusMachine';
import { getClaimSlaState } from '@/lib/claims/sla';
import {
  loadCanonicalFinancialAggregate,
  type CanonicalCurrencyAggregate,
} from '@/lib/financial/canonicalAggregates';

export const REPORT_RANGES = ['7d', '30d', '90d', 'all'] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];
export const FINANCIAL_REPORT_METRICS = [
  'requested',
  'exposed',
  'approved',
  'paid',
  'estimated_loss',
  'prevented',
  'confirmed_loss',
  'recoverable',
  'recovered',
  'outstanding',
  'written_off',
  'final_net_loss',
] as const;
export type FinancialReportMetric = (typeof FINANCIAL_REPORT_METRICS)[number];
export type MoneyBridge = {
  currency:string;
  requestedMinor:number;
  exposedMinor:number;
  approvedMinor:number;
  paidMinor:number;
  estimatedLossMinor:number;
  preventedMinor:number;
  realisedLossMinor:number;
  recoverableMinor:number;
  recoveredMinor:number;
  outstandingMinor:number;
  writtenOffMinor:number;
  finalNetLossMinor:number;
  knownStates:string[];
  caseIds:string[];
  caseIdsByState?:Partial<Record<FinancialReportMetric,string[]>>;
  caseCountsByState?:Partial<Record<FinancialReportMetric,number>>;
};
export type RankedRow = { key:string; label:string; count:number; amountMinor:number; currency:string; href:string; recordIds:string[] };
export type CoverageRow = {
  objectType:string;
  scope:'connected-source'|'internal';
  records:number;
  freshRecords:number;
  staleRecords:number;
  latestAt:string|null;
  href:string;
};
export type ReportTrendPoint = {
  date:string;
  exposureMinor:number;
  recoveredMinor:number;
  preventedMinor:number;
  realisedLossMinor:number;
  currency:string;
  knownStates:string[];
};
export type DashboardOperationExposure = {
  currency:string;
  knownMinor:number;
  knownCaseCount:number;
  unvaluedCaseCount:number;
};
export type DashboardOperationRow = {
  key:string;
  label:string;
  count:number;
  activeCount:number;
  snoozedCount:number;
  href:string;
  overdueCount:number;
  approachingCount:number;
  readyCount:number;
  oldestOpenedAt:string|null;
  exposureByCurrency:DashboardOperationExposure[];
};
export type FinancialConfidence = {
  state:'complete'|'qualified'|'unavailable';
  issueCount:number;
  affectedCurrencies:string[];
  affectedMetrics:FinancialReportMetric[];
  excludedRecordCount:number;
  currencyExcludedRecordCount:number;
  unreconciledExcludedRecordCount:number;
};
export type IntelligenceReport = {
  range:ReportRange;
  timezone:string;
  generatedAt:string;
  bridges:MoneyBridge[];
  trend:ReportTrendPoint[];
  causes:RankedRow[];
  operations:DashboardOperationRow[];
  recoveries:RankedRow[];
  coverage:CoverageRow[];
  reconciliation:{ok:boolean;issues:string[];confidence:FinancialConfidence};
  recordCount:number;
  financialScope?:{
    definitionVersion:string;
    timeBasis:'case_submitted_at';
    mixedCurrencyPolicy:'separated';
    unknownPolicy:'withheld_not_zero';
    source:'canonical'|'compatibility';
  };
};
export type DashboardPeriodComparison = {
  range: Exclude<ReportRange, 'all'>;
  startAt: string;
  endAt: string;
  bridges: MoneyBridge[];
  trend: ReportTrendPoint[];
};

type Client={
  from:(table:string)=>any;
  rpc?:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:{message:string}|null}>;
};
const RANGE_DAYS:Record<Exclude<ReportRange,'all'>,number>={ '7d':7,'30d':30,'90d':90 };
export function parseReportRange(value:string|undefined):ReportRange{return REPORT_RANGES.includes(value as ReportRange)?value as ReportRange:'30d'}
export function reportCutoff(range:ReportRange, asOf=now()):string|null { if(range==='all')return null; return new Date(asOf.getTime()-RANGE_DAYS[range]*86400000).toISOString(); }
export function normalizeReportTimezone(value:string|null|undefined):string {
  const candidate=typeof value==='string'&&value.length>0&&value.length<80?value:'UTC';
  try {
    new Intl.DateTimeFormat('en-GB',{timeZone:candidate}).format(new Date(0));
    return candidate;
  } catch {
    return 'UTC';
  }
}
export function reportDateKey(value:string|Date,timezone='UTC'):string {
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))return'';
  const formatter=new Intl.DateTimeFormat('en-GB',{
    timeZone:normalizeReportTimezone(timezone),
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
  });
  const parts=Object.fromEntries(
    formatter.formatToParts(date)
      .filter(part=>part.type==='year'||part.type==='month'||part.type==='day')
      .map(part=>[part.type,part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function dashboardPreviousPeriodWindow(
  range: ReportRange,
  now = new Date(),
): { range: Exclude<ReportRange, 'all'>; startAt: string; endAt: string } | null {
  if (range === 'all') return null;
  const durationMs = RANGE_DAYS[range] * 86_400_000;
  const endAt = new Date(now.getTime() - durationMs);
  return {
    range,
    startAt: new Date(endAt.getTime() - durationMs).toISOString(),
    endAt: endAt.toISOString(),
  };
}
export function isFinancialReportMetric(value:string):value is FinancialReportMetric {
  return FINANCIAL_REPORT_METRICS.includes(value as FinancialReportMetric);
}

export type FinancialTruthResult = {
  rows: Array<Record<string, unknown>>;
  issues: string[];
  affectedMetrics: FinancialReportMetric[];
  excludedRecordCount: number;
};

/**
 * Keep the report's eligible-recovery stage truthful at the presentation
 * boundary. A recovery route is only eligible when the same case/currency has
 * a confirmed loss that bounds it. Invalid rows remain in the report scope,
 * but their inapplicable recovery stages are withheld rather than shown as a
 * confident zero or an impossible amount.
 */
export function enforceFinancialTruth(
  rows: Array<Record<string, unknown>>,
): FinancialTruthResult {
  let invalidEligible = 0;
  let invalidRecovered = 0;
  const safeRows = rows.map((row) => {
    const states = new Set(
      (Array.isArray(row.known_states) ? row.known_states : []).map(String),
    );
    const confirmed = Number(row.confirmed_loss_minor);
    const eligible = Number(row.recoverable_minor);
    const recovered = Number(row.recovered_minor);
    const hasConfirmed = states.has('confirmed_loss') && Number.isInteger(confirmed) && confirmed >= 0;
    const hasEligible = states.has('recoverable') && Number.isInteger(eligible) && eligible >= 0;
    const nextStates = new Set(states);
    if (states.has('recoverable') && (!hasConfirmed || !hasEligible || eligible > confirmed)) {
      nextStates.delete('recoverable');
      nextStates.delete('recovered');
      invalidEligible += 1;
    }
    if (states.has('recovered') && (!hasEligible || !Number.isInteger(recovered) || recovered < 0 || recovered > eligible)) {
      nextStates.delete('recovered');
      invalidRecovered += 1;
    }
    return { ...row, known_states: [...nextStates] };
  });
  const issues: string[] = [];
  if (invalidEligible) {
    issues.push(`${invalidEligible} record${invalidEligible === 1 ? '' : 's'} have eligible recovery without a valid confirmed-loss bound; eligible recovery is unavailable for those records`);
  }
  if (invalidRecovered) {
    issues.push(`${invalidRecovered} record${invalidRecovered === 1 ? '' : 's'} have recovered cash without a valid eligible-recovery bound; recovered cash is unavailable for those records`);
  }
  const affectedMetrics = new Set<FinancialReportMetric>();
  if (invalidEligible) {
    affectedMetrics.add('recoverable');
    affectedMetrics.add('outstanding');
    affectedMetrics.add('recovered');
  }
  if (invalidRecovered) affectedMetrics.add('recovered');
  return {
    rows: safeRows,
    issues,
    affectedMetrics: [...affectedMetrics],
    excludedRecordCount: invalidEligible + invalidRecovered,
  };
}

export function financialMetricIsKnown(bridge:MoneyBridge, metric:FinancialReportMetric):boolean {
  const state = metric === 'outstanding'
    ? 'recoverable'
    : metric === 'final_net_loss'
      ? 'confirmed_loss'
      : metric;
  return bridge.knownStates.includes(state);
}

export function financialMetricValue(bridge:MoneyBridge, metric:FinancialReportMetric):number|null {
  if (!financialMetricIsKnown(bridge, metric)) return null;
  if (metric === 'requested') return bridge.requestedMinor;
  if (metric === 'exposed') return bridge.exposedMinor;
  if (metric === 'approved') return bridge.approvedMinor;
  if (metric === 'paid') return bridge.paidMinor;
  if (metric === 'estimated_loss') return bridge.estimatedLossMinor;
  if (metric === 'prevented') return bridge.preventedMinor;
  if (metric === 'confirmed_loss') return bridge.realisedLossMinor;
  if (metric === 'recoverable') return bridge.recoverableMinor;
  if (metric === 'recovered') return bridge.recoveredMinor;
  if (metric === 'outstanding') return bridge.outstandingMinor;
  if (metric === 'written_off') return bridge.writtenOffMinor;
  return bridge.finalNetLossMinor;
}

export function financialMetricCaseIds(bridge:MoneyBridge, metric:FinancialReportMetric):string[] {
  return bridge.caseIdsByState?.[metric] ?? [];
}

export function financialMetricCaseCount(bridge:MoneyBridge, metric:FinancialReportMetric):number {
  return bridge.caseCountsByState?.[metric] ?? financialMetricCaseIds(bridge, metric).length;
}

export function financialReportRecordsHref(input:{range:ReportRange;currency:string;metric:FinancialReportMetric;category?:string;timezone?:string;from?:string;to?:string}):string {
  const params = new URLSearchParams({
    kind: 'case',
    dimension: input.category ? 'category' : 'financial',
    metric: input.metric,
    range: input.range,
    currency: input.currency,
  });
  if (input.category) params.set('value', input.category);
  if (input.timezone) params.set('timezone', normalizeReportTimezone(input.timezone));
  if (input.from) params.set('from', input.from);
  if (input.to) params.set('to', input.to);
  return `/financials/reports/records?${params.toString()}`;
}

export function aggregateMoneyBridges(rows:Array<Record<string,unknown>>):MoneyBridge[] {
  const byCurrency=new Map<string,MoneyBridge>();
  const statesByCurrency=new Map<string,Set<string>>();
  const caseIdsByCurrency=new Map<string,Set<string>>();
  const casesByStateByCurrency=new Map<string,Map<FinancialReportMetric,Set<string>>>();
  for(const row of rows){
    const currency=normaliseCurrencyOrNull(row.currency);
    if(!currency)continue;
    const rowStates=new Set(
      (Array.isArray(row.known_states)?row.known_states:[]).map(String),
    );
    const bridge=byCurrency.get(currency)??{
      currency,requestedMinor:0,exposedMinor:0,approvedMinor:0,paidMinor:0,
      estimatedLossMinor:0,preventedMinor:0,realisedLossMinor:0,
      recoverableMinor:0,recoveredMinor:0,outstandingMinor:0,
      writtenOffMinor:0,finalNetLossMinor:0,knownStates:[],caseIds:[],caseIdsByState:{},caseCountsByState:{},
    };
    if(rowStates.has('requested'))bridge.requestedMinor+=Number(row.requested_minor||0);
    if(rowStates.has('exposed'))bridge.exposedMinor+=Number(row.exposed_minor||0);
    if(rowStates.has('approved'))bridge.approvedMinor+=Number(row.approved_minor||0);
    if(rowStates.has('paid'))bridge.paidMinor+=Number(row.paid_minor||0);
    if(rowStates.has('estimated_loss'))bridge.estimatedLossMinor+=Number(row.estimated_loss_minor||0);
    if(rowStates.has('prevented'))bridge.preventedMinor+=Number(row.prevented_minor||0);
    if(rowStates.has('confirmed_loss'))bridge.realisedLossMinor+=Number(row.confirmed_loss_minor||0);
    if(rowStates.has('recoverable'))bridge.recoverableMinor+=Number(row.recoverable_minor||0);
    if(rowStates.has('recovered'))bridge.recoveredMinor+=Number(row.recovered_minor||0);
    if(rowStates.has('written_off'))bridge.writtenOffMinor+=Number(row.written_off_minor||0);
    const caseId=typeof row.support_payout_case_id==='string'?row.support_payout_case_id:null;
    const known=statesByCurrency.get(currency)??new Set<string>();
    const casesByState=casesByStateByCurrency.get(currency)??new Map<FinancialReportMetric,Set<string>>();
    for(const state of rowStates){
      known.add(state);
      if(caseId&&isFinancialReportMetric(state)){
        const stateCases=casesByState.get(state)??new Set<string>();
        stateCases.add(caseId);
        casesByState.set(state,stateCases);
      }
    }
    if(caseId){
      const caseIds=caseIdsByCurrency.get(currency)??new Set<string>();
      caseIds.add(caseId);
      caseIdsByCurrency.set(currency,caseIds);
      if(rowStates.has('recoverable')){
        const outstandingCases=casesByState.get('outstanding')??new Set<string>();
        outstandingCases.add(caseId);
        casesByState.set('outstanding',outstandingCases);
        bridge.outstandingMinor+=Math.max(
          0,
          Number(row.recoverable_minor||0)
            -(rowStates.has('recovered')?Number(row.recovered_minor||0):0)
            -(rowStates.has('written_off')?Number(row.written_off_minor||0):0),
        );
      }
      if(rowStates.has('confirmed_loss')){
        const finalNetLossCases=casesByState.get('final_net_loss')??new Set<string>();
        finalNetLossCases.add(caseId);
        casesByState.set('final_net_loss',finalNetLossCases);
        bridge.finalNetLossMinor+=Math.max(
          0,
          Number(row.confirmed_loss_minor||0)
            -(rowStates.has('recovered')?Number(row.recovered_minor||0):0),
        );
      }
    }
    statesByCurrency.set(currency,known);
    casesByStateByCurrency.set(currency,casesByState);
    byCurrency.set(currency,bridge);
  }
  for(const bridge of byCurrency.values()){
    bridge.knownStates=[...(statesByCurrency.get(bridge.currency)??new Set<string>())].sort();
    bridge.caseIds=[...(caseIdsByCurrency.get(bridge.currency)??new Set<string>())].sort();
    bridge.caseIdsByState=Object.fromEntries(
      [...(casesByStateByCurrency.get(bridge.currency)??new Map()).entries()]
        .map(([state,caseIds])=>[state,[...caseIds].sort()]),
    );
    bridge.caseCountsByState=Object.fromEntries(
      Object.entries(bridge.caseIdsByState ?? {}).map(([state, caseIds]) => [state, caseIds?.length ?? 0]),
    );
  }
  return[...byCurrency.values()].sort((a,b)=>a.currency.localeCompare(b.currency));
}

function applyCanonicalCurrencyAggregate(
  canonical: CanonicalCurrencyAggregate,
  compatibility: MoneyBridge | undefined,
): MoneyBridge {
  return {
    currency: canonical.currency,
    requestedMinor: canonical.requestedMinor,
    exposedMinor: canonical.exposedMinor,
    approvedMinor: canonical.approvedMinor,
    paidMinor: canonical.paidMinor,
    estimatedLossMinor: canonical.estimatedLossMinor,
    preventedMinor: canonical.preventedMinor,
    realisedLossMinor: canonical.confirmedLossMinor,
    recoverableMinor: canonical.recoverableMinor,
    recoveredMinor: canonical.recoveredMinor,
    outstandingMinor: canonical.outstandingMinor,
    writtenOffMinor: canonical.writtenOffMinor,
    finalNetLossMinor: canonical.finalNetLossMinor,
    knownStates: canonical.knownStates,
    caseIds: compatibility?.caseIds ?? [],
    caseIdsByState: compatibility?.caseIdsByState ?? {},
    caseCountsByState: canonical.caseCountsByState,
  };
}

export function buildReportTrend(
  cases: Array<{ id: string; submitted_at?: string | null; created_at?: string | null; updated_at?: string | null }>,
  financial: Array<{
    support_payout_case_id: string;
    currency?: string | null;
    exposed_minor?: number | null;
    recovered_minor?: number | null;
    prevented_minor?: number | null;
    confirmed_loss_minor?: number | null;
    known_states?: string[] | null;
  }>,
  timezone = 'UTC',
): ReportTrendPoint[] {
  const normalizedTimezone=normalizeReportTimezone(timezone);
  const financialByCase = new Map(financial.map((row) => [row.support_payout_case_id, row]));
  const trendMap = new Map<string, ReportTrendPoint>();
  for (const payoutCase of cases) {
    const entry = financialByCase.get(payoutCase.id);
    const currency = normaliseCurrencyOrNull(entry?.currency);
    if (!entry || !currency) continue;
    const date = reportDateKey(
      String(payoutCase.submitted_at || payoutCase.created_at || payoutCase.updated_at || ''),
      normalizedTimezone,
    );
    if (!date) continue;
    const key = `${currency}:${date}`;
    const point = trendMap.get(key) ?? {
      date,
      exposureMinor: 0,
      recoveredMinor: 0,
      preventedMinor: 0,
      realisedLossMinor: 0,
      currency,
      knownStates: [],
    };
    const entryStates = new Set((entry.known_states ?? []).map(String));
    if (entryStates.has('exposed')) point.exposureMinor += Number(entry.exposed_minor || 0);
    if (entryStates.has('recovered')) point.recoveredMinor += Number(entry.recovered_minor || 0);
    if (entryStates.has('prevented')) point.preventedMinor += Number(entry.prevented_minor || 0);
    if (entryStates.has('confirmed_loss')) point.realisedLossMinor += Number(entry.confirmed_loss_minor || 0);
    point.knownStates = [...new Set([...point.knownStates, ...entryStates])].sort();
    trendMap.set(key, point);
  }
  return [...trendMap.values()].sort((a, b) => a.currency.localeCompare(b.currency) || a.date.localeCompare(b.date));
}

export function dashboardTrendMismatches(
  bridge: MoneyBridge,
  trend: ReportTrendPoint[],
): FinancialReportMetric[] {
  const points = trend.filter((point) => point.currency === bridge.currency);
  const totals = points.reduce(
    (result, point) => ({
      exposed: result.exposed + point.exposureMinor,
      prevented: result.prevented + point.preventedMinor,
      recovered: result.recovered + point.recoveredMinor,
      confirmed_loss: result.confirmed_loss + point.realisedLossMinor,
    }),
    { exposed: 0, prevented: 0, recovered: 0, confirmed_loss: 0 },
  );
  const expected = {
    exposed: bridge.exposedMinor,
    prevented: bridge.preventedMinor,
    recovered: bridge.recoveredMinor,
    confirmed_loss: bridge.realisedLossMinor,
  };
  return (Object.keys(expected) as Array<keyof typeof expected>)
    .filter((metric) => totals[metric] !== expected[metric]);
}

/**
 * The reconstructed production baseline does not yet have the later
 * `case_financial_summaries.known_states` projection column. Derive the
 * presence of each state from the canonical append-only ledger instead of
 * treating missing metadata as zero. This keeps reporting truthful while the
 * production migration history is being rolled forward.
 */
async function attachKnownFinancialStates(
  client: Client,
  merchantId: string,
  financialRows: Array<Record<string, any>>,
  preloadedEntries?: {
    data: Array<Record<string, any>> | null;
    error: { message?: string } | null;
  },
): Promise<Array<Record<string, any>>> {
  if (!financialRows.length) return financialRows;
  const caseIds = financialRows
    .map((row) => typeof row.support_payout_case_id === 'string' ? row.support_payout_case_id : null)
    .filter((value): value is string => Boolean(value));
  if (!caseIds.length) return financialRows.map((row) => ({ ...row, known_states: [] }));

  const { data: entryData, error } = preloadedEntries ?? await client
      .from(TABLES.CASE_FINANCIAL_ENTRIES)
      .select('support_payout_case_id,currency,state')
      .eq('merchant_id', merchantId)
      .in('support_payout_case_id', caseIds);
  if (error) return financialRows.map((row) => ({ ...row, known_states: [] }));

  const statesByCaseCurrency = new Map<string, Set<string>>();
  for (const entry of (entryData ?? []) as Array<Record<string, any>>) {
    const caseId = typeof entry.support_payout_case_id === 'string' ? entry.support_payout_case_id : null;
    const currency = normaliseCurrencyOrNull(entry.currency);
    const state = typeof entry.state === 'string' ? entry.state : null;
    if (!caseId || !currency || !state) continue;
    const key = `${caseId}:${currency}`;
    const states = statesByCaseCurrency.get(key) ?? new Set<string>();
    states.add(state);
    statesByCaseCurrency.set(key, states);
  }

  return financialRows.map((row) => {
    const caseId = typeof row.support_payout_case_id === 'string' ? row.support_payout_case_id : '';
    const currency = normaliseCurrencyOrNull(row.currency);
    const states = currency ? statesByCaseCurrency.get(`${caseId}:${currency}`) : null;
    return { ...row, known_states: states ? [...states].sort() : [] };
  });
}

/** Previous-period financial projection used by the dashboard comparison. */
export async function loadDashboardPeriodComparison(
  client: Client,
  merchantId: string,
  range: ReportRange,
  asOf = now(),
  timezone = 'UTC',
): Promise<DashboardPeriodComparison | null> {
  const window = dashboardPreviousPeriodWindow(range, asOf);
  if (!window) return null;

  const { data: caseData } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,submitted_at,created_at,updated_at')
    .eq('merchant_id', merchantId)
    .gte('submitted_at', window.startAt)
    .lt('submitted_at', window.endAt)
    .order('submitted_at', { ascending: true })
    .limit(10000);
  const cases = (caseData ?? []) as Array<{
    id: string;
    submitted_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  }>;
  const caseIds = cases.map((row) => row.id);
  const [financialResult, entryResult] = caseIds.length
    ? await Promise.all([
        client
          .from(TABLES.CASE_FINANCIAL_SUMMARIES)
          .select('support_payout_case_id,currency,requested_minor,exposed_minor,prevented_minor,confirmed_loss_minor,recovered_minor')
          .eq('merchant_id', merchantId)
          .in('support_payout_case_id', caseIds),
        client
          .from(TABLES.CASE_FINANCIAL_ENTRIES)
          .select('support_payout_case_id,currency,state')
          .eq('merchant_id', merchantId)
          .in('support_payout_case_id', caseIds),
      ])
    : [{ data: [] }, { data: [], error: null }];
  const attachedFinancial = await attachKnownFinancialStates(
    client,
    merchantId,
    (financialResult.data ?? []) as Array<Record<string, any>>,
    {
      data: (entryResult.data ?? []) as Array<Record<string, any>>,
      error: entryResult.error ?? null,
    },
  );
  const financialTruth = enforceFinancialTruth(attachedFinancial);
  const financial = financialTruth.rows as Array<{
    support_payout_case_id: string;
    currency?: string | null;
    requested_minor?: number | null;
    exposed_minor?: number | null;
    prevented_minor?: number | null;
    confirmed_loss_minor?: number | null;
    recovered_minor?: number | null;
    known_states?: string[] | null;
  }>;

  return {
    ...window,
    bridges: aggregateMoneyBridges(financial as Array<Record<string, any>>),
    trend: buildReportTrend(cases, financial, timezone),
  };
}

function lossCategoryFor(caseIssue:string|null|undefined): string {
  if (['item_not_received','missing_parcel'].includes(caseIssue ?? '')) return 'delivery_loss';
  if (caseIssue === 'chargeback') return 'chargeback_or_payment_dispute';
  if (['missing_item','wrong_item','damaged','not_as_described'].includes(caseIssue ?? '')) return 'fulfilment_or_warehouse_error';
  return 'supplier_or_vendor_issue';
}

function addRank(
  map:Map<string,RankedRow>,
  key:string,
  rowLabel:string,
  amountMinor:number,
  currency:string,
  href:string,
  recordId:string,
){
  const id=`${key}:${currency}`;
  const row=map.get(id)??{key,label:rowLabel,count:0,amountMinor:0,currency,href,recordIds:[]};
  row.count++;
  row.amountMinor+=amountMinor;
  if(!row.recordIds.includes(recordId))row.recordIds.push(recordId);
  map.set(id,row);
}

/**
 * Records that have reached a terminal state are settled, not stale. A delivered
 * shipment or a closed ticket is never written again, so counting it against
 * source freshness makes every merchant with more than 48 hours of history
 * report a permanently growing "records stale" figure against a source that is
 * in fact healthy. Only records a live feed is still expected to touch can go
 * stale, so the staleness count exempts terminal rows.
 *
 * Entries are deliberately narrow. A table absent from this map gets no
 * exemption: over-broad terminal sets would hide the genuine feed outages this
 * measure exists to surface. Orders are excluded on purpose — an order can still
 * be refunded or amended long after fulfilment, so no fulfilment state settles
 * it. Returns and cases likewise have no state that is provably final here.
 */
const COVERAGE_TERMINAL_STATES: Partial<Record<string,{column:string;values:readonly string[]}>>={
  [TABLES.SOURCE_SHIPMENTS]:{column:'status',values:['delivered']},
  [TABLES.SOURCE_TICKETS]:{column:'status',values:['closed']},
};

/**
 * Refunds are immutable ingest events; no row is ever expected to change, so
 * none of them can fall behind a live feed.
 */
const COVERAGE_IMMUTABLE_TABLES=new Set<string>([TABLES.SOURCE_REFUNDS]);

async function loadReportingCoverage(
  client: Client,
  merchantId: string,
  staleBefore: string,
): Promise<CoverageRow[]> {
  const coverageSpecs=[
    [TABLES.SOURCE_ORDERS,'Orders','/sources/connected','connected-source'],
    [TABLES.SOURCE_TICKETS,'Tickets','/sources/connected','connected-source'],
    [TABLES.SOURCE_SHIPMENTS,'Shipments','/sources/connected','connected-source'],
    [TABLES.SOURCE_REFUNDS,'Refunds','/sources/connected','connected-source'],
    [TABLES.SOURCE_RETURNS,'Returns','/sources/connected','connected-source'],
    [TABLES.MERCHANT_CLAIMS,'Cases','/cases','internal'],
  ] as const;

  return Promise.all(
    coverageSpecs.map(async([table,objectType,href,scope])=>{
      const date=table===TABLES.SOURCE_REFUNDS?'ingested_at':'updated_at';
      const terminal=COVERAGE_TERMINAL_STATES[table];
      // Rows older than the cutoff that are still expected to change. A null
      // status is never treated as terminal, so an unmapped row still counts.
      let staleQuery=client.from(table).select('id',{count:'exact',head:true}).eq('merchant_id',merchantId).lt(date,staleBefore);
      if(terminal){
        staleQuery=staleQuery.or(`${terminal.column}.is.null,${terminal.column}.not.in.(${terminal.values.join(',')})`);
      }
      // Internal records have no upstream feed, so they cannot go stale against
      // one. Their row still reports record count and latest activity, which is
      // the useful part; an idle open case is a workload signal that the SLA and
      // overdue surfaces already carry, and "Repair connection" is not an action
      // that applies to a record created inside Unauth.
      const measuresSourceFreshness=scope==='connected-source'&&!COVERAGE_IMMUTABLE_TABLES.has(table);
      const [latest,stale]=await Promise.all([
        client.from(table).select(`id,${date}`,{count:'exact'}).eq('merchant_id',merchantId).order(date,{ascending:false}).limit(1),
        measuresSourceFreshness?staleQuery:Promise.resolve({count:0}),
      ]);
      const records=latest.count??0;
      const staleRecords=Math.min(records,Math.max(0,stale.count??0));
      return{
        objectType,
        scope,
        records,
        freshRecords:records-staleRecords,
        staleRecords,
        latestAt:(latest.data as Array<Record<string,any>>|null)?.[0]?.[date]??null,
        href,
      };
    }),
  );
}

/** Canonical reporting projection. Money never crosses currency boundaries. */
export async function loadIntelligenceReport(
  client:Client,
  merchantId:string,
  range:ReportRange,
  timezone='UTC',
  options:{asOf?:Date}={},
):Promise<IntelligenceReport>{
  const asOf=options.asOf??now();
  const normalizedTimezone=normalizeReportTimezone(timezone);
  const cutoff=reportCutoff(range,asOf);
  const staleBefore=new Date(nowMs()-48*3600000).toISOString();
  const canonicalAggregatePromise = client.rpc
    ? loadCanonicalFinancialAggregate(client as Parameters<typeof loadCanonicalFinancialAggregate>[0], merchantId, {
      from: cutoff,
      to: asOf.toISOString(),
    })
    : Promise.resolve(null);
  const recoveryPromise=client
    .from(TABLES.RECOVERY_CASES)
    .select('id,status,recovery_type,currency,amount_recovered,updated_at')
    .eq('merchant_id',merchantId)
    .limit(10000);
  const coveragePromise=loadReportingCoverage(client,merchantId,staleBefore);
  let casesQuery=client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,status,claim_type,reason_normalized,loss_attribution,currency,submitted_at,created_at,updated_at,snoozed_until')
    .eq('merchant_id',merchantId)
    .order('updated_at',{ascending:false})
    .limit(10000);
  if(cutoff)casesQuery=casesQuery.gte('submitted_at',cutoff);
  const {data:caseData}=await casesQuery;
  const cases=(caseData??[]) as Array<Record<string,any>>;
  const caseIds=cases.map(c=>c.id);
  const [financialResult,entryResult]=caseIds.length
    ?await Promise.all([
      client
        .from(TABLES.CASE_FINANCIAL_SUMMARIES)
        .select('support_payout_case_id,currency,requested_minor,exposed_minor,approved_minor,paid_minor,estimated_loss_minor,prevented_minor,confirmed_loss_minor,recoverable_minor,recovered_minor,written_off_minor,updated_at')
        .eq('merchant_id',merchantId)
        .in('support_payout_case_id',caseIds),
      client
        .from(TABLES.CASE_FINANCIAL_ENTRIES)
        .select('support_payout_case_id,currency,state')
        .eq('merchant_id',merchantId)
        .in('support_payout_case_id',caseIds),
    ])
    :[{data:[]},{data:[],error:null}];
  const financialData=financialResult.data;
  const attachedFinancial=await attachKnownFinancialStates(
    client,
    merchantId,
    (financialData??[]) as Array<Record<string,any>>,
    {
      data:(entryResult.data??[]) as Array<Record<string,any>>,
      error:entryResult.error??null,
    },
  );
  const financialTruth=enforceFinancialTruth(attachedFinancial);
  const financial=financialTruth.rows;
  const compatibilityBridges=aggregateMoneyBridges(financial);
  const canonicalAggregate=await canonicalAggregatePromise;
  const compatibilityByCurrency=new Map(compatibilityBridges.map((bridge)=>[bridge.currency,bridge]));
  const bridges=canonicalAggregate?.source==='canonical'
    ?canonicalAggregate.currencies.map((row)=>applyCanonicalCurrencyAggregate(row,compatibilityByCurrency.get(row.currency)))
    :compatibilityBridges;
  const financialByCase=new Map(financial.map(r=>[r.support_payout_case_id,r]));
  const causesMap=new Map<string,RankedRow>();

  for(const c of cases){
    const f=financialByCase.get(c.id);
    const knownStates=Array.isArray(f?.known_states)?f.known_states.map(String):[];
    const currency=normaliseCurrencyOrNull(f?.currency);
    if(!f||!currency||!knownStates.includes('confirmed_loss'))continue;
    const key=lossCategoryFor(c.reason_normalized??c.claim_type);
    addRank(
      causesMap,
      key,
      label('lossCategory',key),
      Number(f.confirmed_loss_minor||0),
      currency,
      financialReportRecordsHref({
        range,
        currency,
        metric:'confirmed_loss',
        category:key,
        timezone:normalizedTimezone,
      }),
      String(c.id),
    );
  }

  const trend=buildReportTrend(
    cases as Array<{id:string;submitted_at?:string|null;created_at?:string|null;updated_at?:string|null}>,
    financial as Array<{support_payout_case_id:string;currency?:string|null;exposed_minor?:number|null;recovered_minor?:number|null;prevented_minor?:number|null;confirmed_loss_minor?:number|null;known_states?:string[]|null}>,
    normalizedTimezone,
  );

  type MutableOperation = Omit<DashboardOperationRow,'exposureByCurrency'> & {
    exposureByCurrency:Map<string,{knownMinor:number;knownCaseCount:number}>;
  };
  const activeStatuses=new Set<string>(ACTIVE_CANONICAL_CLAIM_STATUSES);
  const operationsMap=new Map<string,MutableOperation>();
  for(const payoutCase of cases){
    const rawStatus=String(payoutCase.status||'unknown');
    const normalizedStatus=normalizeLegacyClaimStatus(rawStatus);
    const key=normalizedStatus??rawStatus;
    const operation=operationsMap.get(key)??{
      key,
      label:label('caseStatus',key),
      count:0,
      activeCount:0,
      snoozedCount:0,
      href:`/financials/reports/records?kind=case&dimension=status&value=${encodeURIComponent(key)}&range=${range}&timezone=${encodeURIComponent(normalizedTimezone)}`,
      overdueCount:0,
      approachingCount:0,
      readyCount:0,
      oldestOpenedAt:null,
      exposureByCurrency:new Map(),
    };
    operation.count+=1;
    const snoozedUntil=typeof payoutCase.snoozed_until==='string'
      ?Date.parse(payoutCase.snoozed_until)
      :Number.NaN;
    const isSnoozed=Number.isFinite(snoozedUntil)&&snoozedUntil>asOf.getTime();
    const isActive=normalizedStatus!=null&&activeStatuses.has(normalizedStatus);
    if(isActive&&isSnoozed)operation.snoozedCount+=1;
    if(isActive&&!isSnoozed){
      operation.activeCount+=1;
      const sla=getClaimSlaState(payoutCase,asOf);
      if(sla.state==='overdue')operation.overdueCount+=1;
      if(sla.state==='approaching')operation.approachingCount+=1;
      if(normalizedStatus==='ready_for_decision'||normalizedStatus==='open'){
        operation.readyCount+=1;
      }
      const openedAt=String(
        payoutCase.submitted_at||payoutCase.created_at||payoutCase.updated_at||'',
      );
      if(
        openedAt
        &&!Number.isNaN(Date.parse(openedAt))
        &&(!operation.oldestOpenedAt||Date.parse(openedAt)<Date.parse(operation.oldestOpenedAt))
      ){
        operation.oldestOpenedAt=openedAt;
      }
      const financialRow=financialByCase.get(payoutCase.id);
      const financialCurrency=normaliseCurrencyOrNull(financialRow?.currency);
      const financialStates=new Set(
        Array.isArray(financialRow?.known_states)
          ?financialRow.known_states.map(String)
          :[],
      );
      if(financialCurrency&&financialStates.has('exposed')){
        const exposure=operation.exposureByCurrency.get(financialCurrency)??{
          knownMinor:0,
          knownCaseCount:0,
        };
        exposure.knownMinor+=Number(financialRow?.exposed_minor||0);
        exposure.knownCaseCount+=1;
        operation.exposureByCurrency.set(financialCurrency,exposure);
      }
    }
    operationsMap.set(key,operation);
  }
  const operations:DashboardOperationRow[]=[...operationsMap.values()]
    .map(operation=>({
      ...operation,
      exposureByCurrency:[...operation.exposureByCurrency.entries()]
        .map(([currency,value])=>({
          currency,
          ...value,
          unvaluedCaseCount:Math.max(0,operation.activeCount-value.knownCaseCount),
        }))
        .sort((a,b)=>a.currency.localeCompare(b.currency)),
    }))
    .sort((a,b)=>b.activeCount-a.activeCount||b.count-a.count||a.key.localeCompare(b.key));

  /*
   * recovery_cases stores a DECIMAL `amount_recovered`; there is no
   * `amount_recovered_minor` column. Convert to minor units at the reporting
   * boundary, where every other financial value is already minor.
   */
  const {data:recoveryData}=await recoveryPromise;
  const recoveryMap=new Map<string,RankedRow>();
  for(const r of (recoveryData??[]) as Array<Record<string,any>>){
    if(cutoff&&r.updated_at<cutoff)continue;
    const currency=normaliseCurrencyOrNull(r.currency);
    if(!currency)continue;
    const status=String(r.status||'unknown');
    addRank(
      recoveryMap,
      status,
      label('recoveryStatus',status),
      Math.round(Number(r.amount_recovered||0)*100),
      currency,
        `/financials/reports/records?kind=recovery&dimension=status&value=${encodeURIComponent(status)}&range=${range}&currency=${currency}&timezone=${encodeURIComponent(normalizedTimezone)}`,
      String(r.id),
    );
  }

  const coverage=await coveragePromise;

  const issues:string[]=[...financialTruth.issues];
  const affectedCurrencies=new Set<string>();
  const affectedMetrics=new Set<FinancialReportMetric>(financialTruth.affectedMetrics);
  const invalidCurrencyRows=attachedFinancial.filter(
    row=>!normaliseCurrencyOrNull(row.currency),
  ).length;
  if(invalidCurrencyRows){
    issues.push(
      `${invalidCurrencyRows} financial record${invalidCurrencyRows===1?' has':'s have'} a missing or invalid currency and ${invalidCurrencyRows===1?'was':'were'} excluded`,
    );
    for(const metric of FINANCIAL_REPORT_METRICS)affectedMetrics.add(metric);
  }
  for(const bridge of bridges){
    if(
      bridge.paidMinor>bridge.exposedMinor
      &&bridge.knownStates.includes('exposed')
      &&bridge.exposedMinor>0
    ){
      issues.push(`${bridge.currency}: paid compensation exceeds recorded exposure`);
      affectedCurrencies.add(bridge.currency);
      affectedMetrics.add('paid');
      affectedMetrics.add('exposed');
    }
    if(bridge.recoveredMinor>bridge.recoverableMinor&&bridge.recoverableMinor>0){
      issues.push(`${bridge.currency}: recovered exceeds eligible recovery`);
      affectedCurrencies.add(bridge.currency);
      affectedMetrics.add('recovered');
      affectedMetrics.add('recoverable');
    }
    const trendMismatches=dashboardTrendMismatches(bridge,trend);
    if(trendMismatches.length>0){
      issues.push(
        `${bridge.currency}: chart totals do not reconcile with the financial value strip`,
      );
      affectedCurrencies.add(bridge.currency);
      for(const metric of trendMismatches)affectedMetrics.add(metric);
    }
  }
  const confidence:FinancialConfidence={
    state:bridges.length===0?'unavailable':issues.length>0?'qualified':'complete',
    issueCount:issues.length,
    affectedCurrencies:[...affectedCurrencies].sort(),
    affectedMetrics:[...affectedMetrics].sort(),
    excludedRecordCount:financialTruth.excludedRecordCount+invalidCurrencyRows,
    currencyExcludedRecordCount:invalidCurrencyRows,
    unreconciledExcludedRecordCount:financialTruth.excludedRecordCount,
  };
  return{
    range,
    timezone:normalizedTimezone,
    generatedAt:asOf.toISOString(),
    bridges,
    trend,
    causes:[...causesMap.values()].sort(
      (a,b)=>b.amountMinor-a.amountMinor||b.count-a.count,
    ),
    operations,
    recoveries:[...recoveryMap.values()].sort(
      (a,b)=>b.amountMinor-a.amountMinor||b.count-a.count,
    ),
    coverage,
    reconciliation:{ok:issues.length===0,issues,confidence},
    recordCount:cases.length,
    financialScope:{
      definitionVersion:canonicalAggregate?.definitionVersion??'legacy-financial-summary-v1',
      timeBasis:'case_submitted_at',
      mixedCurrencyPolicy:'separated',
      unknownPolicy:'withheld_not_zero',
      source:canonicalAggregate?.source==='canonical'?'canonical':'compatibility',
    },
  };
}

export const REPORT_DEFINITIONS=[
  {id:'financial',name:'Financial performance',definition:'Ledger amounts by case submission period and ISO currency.',numerator:'Sum of each canonical financial entry category.',denominator:'Not applicable.',timeBasis:'Case submitted in selected period.'},
  {id:'loss-causes',name:'Loss causes',definition:'Realised loss grouped by canonical issue category.',numerator:'Confirmed loss in each category.',denominator:'All confirmed loss in the same currency and period.',timeBasis:'Case submitted in selected period.'},
  {id:'prevention',name:'Loss prevention',definition:'Recorded exposure that remained unpaid through the configured observation window.',numerator:'Confirmed prevented exposure after the observation window.',denominator:'Known exposed value in the same currency.',timeBasis:'Case submitted in selected period.'},
  {id:'recovery',name:'Recovery performance',definition:'Recovered and outstanding amounts by recovery status.',numerator:'Reconciled recovered amount.',denominator:'Recoverable amount in the same currency.',timeBasis:'Recovery updated in selected period.'},
  {id:'policy',name:'Policy effectiveness',definition:'Recorded merchant decisions grouped by policy result.',numerator:'Cases with the selected recorded result.',denominator:'Cases with a recorded policy result.',timeBasis:'Case submitted in selected period.'},
  {id:'operations',name:'Operations / SLA',definition:'Case workload grouped by canonical state.',numerator:'Cases in each state.',denominator:'All cases in the selected period.',timeBasis:'Case submitted in selected period.'},
  {id:'evidence',name:'Evidence gaps',definition:'Cases whose canonical workflow state identifies missing or awaited evidence.',numerator:'Cases in evidence-waiting states.',denominator:'Open cases in the selected period.',timeBasis:'Case submitted in selected period.'},
  {id:'coverage',name:'Source coverage',definition:'Imported object records and freshness by object family.',numerator:'Records still expected to change that a source refreshed in the last 48 hours. Terminal records are counted as settled, not stale.',denominator:'All imported records in the merchant projection.',timeBasis:'Current source projection.'},
] as const;
