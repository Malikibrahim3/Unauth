import { TABLES } from '@/lib/supabase/tables';
import { normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { label } from '@/lib/ui/labels';

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
};
export type RankedRow = { key:string; label:string; count:number; amountMinor:number; currency:string; href:string; recordIds:string[] };
export type CoverageRow = { objectType:string; records:number; freshRecords:number; staleRecords:number; latestAt:string|null; href:string };
export type ReportTrendPoint = {
  date:string;
  exposureMinor:number;
  recoveredMinor:number;
  preventedMinor:number;
  realisedLossMinor:number;
  currency:string;
  knownStates:string[];
};
export type IntelligenceReport = { range:ReportRange; timezone:string; generatedAt:string; bridges:MoneyBridge[]; trend:ReportTrendPoint[]; causes:RankedRow[]; operations:Array<{key:string;label:string;count:number;href:string}>; recoveries:RankedRow[]; coverage:CoverageRow[]; reconciliation:{ok:boolean;issues:string[]}; recordCount:number };
export type DashboardPeriodComparison = {
  range: Exclude<ReportRange, 'all'>;
  startAt: string;
  endAt: string;
  bridges: MoneyBridge[];
  trend: ReportTrendPoint[];
};

type Client={from:(table:string)=>any};
const RANGE_DAYS:Record<Exclude<ReportRange,'all'>,number>={ '7d':7,'30d':30,'90d':90 };
export function parseReportRange(value:string|undefined):ReportRange{return REPORT_RANGES.includes(value as ReportRange)?value as ReportRange:'30d'}
export function reportCutoff(range:ReportRange, now=new Date()):string|null { if(range==='all')return null; return new Date(now.getTime()-RANGE_DAYS[range]*86400000).toISOString(); }
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

export function financialReportRecordsHref(input:{range:ReportRange;currency:string;metric:FinancialReportMetric;category?:string}):string {
  const params = new URLSearchParams({
    kind: 'case',
    dimension: input.category ? 'category' : 'financial',
    metric: input.metric,
    range: input.range,
    currency: input.currency,
  });
  if (input.category) params.set('value', input.category);
  return `/reports/records?${params.toString()}`;
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
      writtenOffMinor:0,finalNetLossMinor:0,knownStates:[],caseIds:[],caseIdsByState:{},
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
  }
  return[...byCurrency.values()].sort((a,b)=>a.currency.localeCompare(b.currency));
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
): ReportTrendPoint[] {
  const financialByCase = new Map(financial.map((row) => [row.support_payout_case_id, row]));
  const trendMap = new Map<string, ReportTrendPoint>();
  for (const payoutCase of cases) {
    const entry = financialByCase.get(payoutCase.id);
    const currency = normaliseCurrencyOrNull(entry?.currency);
    if (!entry || !currency) continue;
    const date = String(payoutCase.submitted_at || payoutCase.created_at || payoutCase.updated_at || '').slice(0, 10);
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

/** Previous-period financial projection used by the dashboard comparison. */
export async function loadDashboardPeriodComparison(
  client: Client,
  merchantId: string,
  range: ReportRange,
  asOf = new Date(),
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
  const { data: financialData } = caseIds.length
    ? await client
        .from(TABLES.CASE_FINANCIAL_SUMMARIES)
        .select('support_payout_case_id,currency,requested_minor,exposed_minor,prevented_minor,confirmed_loss_minor,recovered_minor,known_states')
        .eq('merchant_id', merchantId)
        .in('support_payout_case_id', caseIds)
    : { data: [] };
  const financial = (financialData ?? []) as Array<{
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
    trend: buildReportTrend(cases, financial),
  };
}

function lossCategoryFor(claimType:string|null|undefined): string {
  if (['item_not_received','missing_parcel'].includes(claimType ?? '')) return 'delivery_loss';
  if (claimType === 'chargeback') return 'chargeback_or_payment_dispute';
  if (['wrong_item','damaged','not_as_described'].includes(claimType ?? '')) return 'fulfilment_or_warehouse_error';
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

/** Canonical reporting projection. Money never crosses currency boundaries. */
export async function loadIntelligenceReport(client:Client,merchantId:string,range:ReportRange,timezone='UTC',options:{asOf?:Date}={}):Promise<IntelligenceReport>{
  const asOf=options.asOf??new Date();
  const cutoff=reportCutoff(range,asOf);
  let casesQuery=client.from(TABLES.MERCHANT_CLAIMS).select('id,status,claim_type,reason_normalized,loss_attribution,currency,submitted_at,created_at,updated_at').eq('merchant_id',merchantId).order('updated_at',{ascending:false}).limit(10000);
  if(cutoff)casesQuery=casesQuery.gte('submitted_at',cutoff);
  const {data:caseData}=await casesQuery; const cases=(caseData??[]) as Array<Record<string,any>>; const caseIds=cases.map(c=>c.id);
  const {data:financialData}=caseIds.length?await client.from(TABLES.CASE_FINANCIAL_SUMMARIES).select('support_payout_case_id,currency,requested_minor,exposed_minor,approved_minor,paid_minor,estimated_loss_minor,prevented_minor,confirmed_loss_minor,recoverable_minor,recovered_minor,written_off_minor,known_states,updated_at').eq('merchant_id',merchantId).in('support_payout_case_id',caseIds):{data:[]};
  const financial=(financialData??[]) as Array<Record<string,any>>; const bridges=aggregateMoneyBridges(financial);
  const financialByCase=new Map(financial.map(r=>[r.support_payout_case_id,r])); const causesMap=new Map<string,RankedRow>();
  for(const c of cases){
    const f=financialByCase.get(c.id);
    const knownStates=Array.isArray(f?.known_states)?f.known_states.map(String):[];
    const currency=normaliseCurrencyOrNull(f?.currency);
    if(!f||!currency||!knownStates.includes('confirmed_loss'))continue;
    const key=lossCategoryFor(c.claim_type);
    addRank(
      causesMap,key,label('lossCategory',key),Number(f.confirmed_loss_minor||0),currency,
      financialReportRecordsHref({range,currency,metric:'confirmed_loss',category:key}),String(c.id),
    );
  }
  const trend=buildReportTrend(
    cases as Array<{id:string;submitted_at?:string|null;created_at?:string|null;updated_at?:string|null}>,
    financial as Array<{support_payout_case_id:string;currency?:string|null;exposed_minor?:number|null;recovered_minor?:number|null;prevented_minor?:number|null;confirmed_loss_minor?:number|null;known_states?:string[]|null}>,
  );
  const statuses=new Map<string,number>();for(const c of cases)statuses.set(c.status,(statuses.get(c.status)??0)+1);
  const {data:recoveryData}=await client.from(TABLES.RECOVERY_CASES).select('id,status,recovery_type,currency,amount_recovered_minor,updated_at').eq('merchant_id',merchantId).limit(10000);const recoveryMap=new Map<string,RankedRow>();
  for(const r of (recoveryData??[]) as Array<Record<string,any>>){if(cutoff&&r.updated_at<cutoff)continue;const currency=normaliseCurrencyOrNull(r.currency);if(!currency)continue;const status=String(r.status||'unknown');addRank(recoveryMap,status,label('recoveryStatus',status),Number(r.amount_recovered_minor||0),currency,`/reports/records?kind=recovery&dimension=status&value=${encodeURIComponent(status)}&range=${range}&currency=${currency}`,String(r.id))}
  const coverageSpecs=[[TABLES.SOURCE_ORDERS,'Orders','/orders'],[TABLES.SOURCE_TICKETS,'Tickets','/tickets'],[TABLES.SOURCE_SHIPMENTS,'Shipments','/shipments'],[TABLES.SOURCE_REFUNDS,'Refunds','/refunds'],[TABLES.SOURCE_RETURNS,'Returns','/returns'],[TABLES.MERCHANT_CLAIMS,'Payout cases','/claims']] as const;const staleBefore=new Date(Date.now()-48*3600000).toISOString();
  const coverage:CoverageRow[]=await Promise.all(coverageSpecs.map(async([table,objectType,href])=>{const date=table===TABLES.SOURCE_REFUNDS?'ingested_at':'updated_at';const [all,fresh,latest]=await Promise.all([client.from(table).select('id',{count:'exact',head:true}).eq('merchant_id',merchantId),client.from(table).select('id',{count:'exact',head:true}).eq('merchant_id',merchantId).gte(date,staleBefore),client.from(table).select(`id,${date}`).eq('merchant_id',merchantId).order(date,{ascending:false}).limit(1)]);const records=all.count??0;const freshRecords=fresh.count??0;return{objectType,records,freshRecords,staleRecords:Math.max(0,records-freshRecords),latestAt:(latest.data as Array<Record<string,any>>|null)?.[0]?.[date]??null,href};}));
  const issues:string[]=[];const invalidCurrencyRows=financial.filter(row=>!normaliseCurrencyOrNull(row.currency)).length;if(invalidCurrencyRows)issues.push(`${invalidCurrencyRows} financial record${invalidCurrencyRows===1?' has':'s have'} a missing or invalid currency and ${invalidCurrencyRows===1?'was':'were'} excluded`);for(const b of bridges){if(b.paidMinor>b.exposedMinor&&b.knownStates.includes('exposed')&&b.exposedMinor>0)issues.push(`${b.currency}: paid compensation exceeds recorded exposure`);if(b.recoveredMinor>b.recoverableMinor&&b.recoverableMinor>0)issues.push(`${b.currency}: recovered exceeds recoverable amount`);const trendExposure=trend.filter(point=>point.currency===b.currency).reduce((sum,point)=>sum+point.exposureMinor,0);const trendRecovered=trend.filter(point=>point.currency===b.currency).reduce((sum,point)=>sum+point.recoveredMinor,0);if(trendExposure!==b.exposedMinor||trendRecovered!==b.recoveredMinor)issues.push(`${b.currency}: chart totals do not reconcile with the financial value strip`)}
  return{range,timezone,generatedAt:asOf.toISOString(),bridges,trend,causes:[...causesMap.values()].sort((a,b)=>b.amountMinor-a.amountMinor||b.count-a.count),operations:[...statuses].map(([key,count])=>({key,label:label('caseStatus',key),count,href:`/reports/records?kind=case&dimension=status&value=${encodeURIComponent(key)}&range=${range}`})).sort((a,b)=>b.count-a.count),recoveries:[...recoveryMap.values()].sort((a,b)=>b.amountMinor-a.amountMinor||b.count-a.count),coverage,reconciliation:{ok:issues.length===0,issues},recordCount:cases.length};
}

export const REPORT_DEFINITIONS=[
  {id:'financial',name:'Financial performance',definition:'Ledger amounts by payout-case period and ISO currency.',numerator:'Sum of each canonical financial entry category.',denominator:'Not applicable.',timeBasis:'Payout case submitted in selected period.'},
  {id:'loss-causes',name:'Loss causes',definition:'Realised loss grouped by canonical issue category.',numerator:'Confirmed loss in each category.',denominator:'All confirmed loss in the same currency and period.',timeBasis:'Payout case submitted in selected period.'},
  {id:'prevention',name:'Payout prevention',definition:'Recorded exposure that remained unpaid through the configured observation window.',numerator:'Confirmed prevented exposure after the observation window.',denominator:'Known exposed value in the same currency.',timeBasis:'Payout case submitted in selected period.'},
  {id:'recovery',name:'Recovery performance',definition:'Recovered and outstanding amounts by recovery status.',numerator:'Reconciled recovered amount.',denominator:'Recoverable amount in the same currency.',timeBasis:'Recovery updated in selected period.'},
  {id:'policy',name:'Policy effectiveness',definition:'Recorded merchant decisions grouped by policy result.',numerator:'Cases with the selected recorded result.',denominator:'Cases with a recorded policy result.',timeBasis:'Payout case submitted in selected period.'},
  {id:'operations',name:'Operations / SLA',definition:'Payout-case workload grouped by canonical state.',numerator:'Cases in each state.',denominator:'All cases in the selected period.',timeBasis:'Payout case submitted in selected period.'},
  {id:'evidence',name:'Evidence gaps',definition:'Cases whose canonical workflow state identifies missing or awaited evidence.',numerator:'Cases in evidence-waiting states.',denominator:'Open cases in the selected period.',timeBasis:'Payout case submitted in selected period.'},
  {id:'coverage',name:'Source coverage',definition:'Imported object records and freshness by object family.',numerator:'Records refreshed in the last 48 hours.',denominator:'All imported records in the merchant projection.',timeBasis:'Current source projection.'},
] as const;
