import { createHash } from 'node:crypto';
import { TABLES } from '@/lib/supabase/tables';
import { normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { normalizeReportTimezone, reportCutoff, enforceFinancialTruth, aggregateMoneyBridges, financialMetricValue, type ReportRange } from '@/lib/reporting/intelligence';
import type { PatternCase, PatternReport } from './claimPatterns';

// A bounded report must never silently become a sample when PostgREST caps a read.
export const PATTERN_CASE_CAP = 500;
type Row = Record<string, any>;
type Client = { from: (table: string) => any };
export async function readPatternRelations(client: Client, merchantId: string, table: string, columns: string, field: string, ids: string[]): Promise<Row[]> {
  const result: Row[] = [];
  for (let i=0; i<ids.length; i+=100) {
    for (let page=0; ; page++) {
      const { data, error, count } = await client.from(table).select(columns, { count: 'exact' })
        .eq('merchant_id', merchantId).in(field, ids.slice(i,i+100)).order(table === TABLES.CASE_FINANCIAL_SUMMARIES ? 'support_payout_case_id' : 'id').range(page*500, page*500+499);
      if (error || !Array.isArray(data) || count == null) throw new Error(`${table}:read_unavailable`);
      result.push(...data);
      if (result.length > 20000) throw new Error(`${table}:read_capped`);
      if (data.length !== Math.min(500, count-page*500)) throw new Error(`${table}:read_partial`);
      if ((page+1)*500 >= count) break;
    }
  }
  return result;
}
const unique = (rows: Row[], field: string): string[] => [...new Set(rows.map(row => row[field]).filter((value): value is string => typeof value === 'string' && Boolean(value)))];
const amount = (row: Row | undefined, key: string, state: string) => row && row.known_states.includes(state) && row[key] != null && Number.isSafeInteger(Number(row[key])) && Number(row[key]) >= 0 ? Number(row[key]) : null;

export async function loadClaimPatterns(client: Client, merchantId: string, range: ReportRange, timezone: string, asOf: Date): Promise<PatternReport> {
  const report: PatternReport = { from: reportCutoff(range, asOf), to: asOf.toISOString(), readAt: asOf.toISOString(), timezone: normalizeReportTimezone(timezone), state: 'complete', issues: [], cases: [], workAvailable: true };
  const read = (table: string, columns: string, field: string, ids: string[]) => readPatternRelations(client, merchantId, table, columns, field, ids);
  let query = client.from(TABLES.MERCHANT_CLAIMS).select('id,source_order_id,claim_type,reason_normalized,submitted_at', {count:'exact'})
    .eq('merchant_id',merchantId).lt('submitted_at',report.to).order('id').limit(PATTERN_CASE_CAP+1);
  if (report.from) query=query.gte('submitted_at',report.from);
  const result = await query;
  if (result.error || !Array.isArray(result.data) || result.count == null) return {...report, state:'unavailable', workAvailable:false, issues:['The submitted-case cohort could not be loaded. Retry this range.']};
  if (result.count > PATTERN_CASE_CAP) return {...report, state:'capped', workAvailable:false, issues:[`This cohort exceeds ${PATTERN_CASE_CAP} cases. Choose a shorter period; no sample is substituted.`]};
  if (result.count !== result.data.length) return {...report,state:'unavailable', workAvailable:false,issues:['The cohort read was incomplete. Retry before using concentrations.']};
  const cases: Row[] = result.data;
  const ids = unique(cases,'id'), orderIds=unique(cases,'source_order_id');
  const safeRead = async (name: string, action: () => Promise<Row[]>) => {
    try { return await action(); } catch { report.state='partial'; report.issues.push(`${name} unavailable or incomplete. Values are withheld; retry this view.`); return []; }
  };
  const [claimed, lines, shipments, finances, entries, work] = await Promise.all([
    safeRead('Claimed items',()=>read(TABLES.CASE_CLAIMED_ITEMS,'id,support_payout_case_id,source_order_line_id,match_status','support_payout_case_id',ids)),
    safeRead('Order lines',()=>read(TABLES.SOURCE_ORDER_LINES,'id,source_order_id,sku,variant_ref','source_order_id',orderIds)),
    safeRead('Shipments',()=>read(TABLES.SOURCE_SHIPMENTS,'id,external_id,source_order_id,source_account_id,carrier,source_record_id,raw_metadata','source_order_id',orderIds)),
    safeRead('Financial summaries',()=>read(TABLES.CASE_FINANCIAL_SUMMARIES,'support_payout_case_id,currency,confirmed_loss_minor,recoverable_minor,recovered_minor','support_payout_case_id',ids)),
    safeRead('Financial evidence',()=>read(TABLES.CASE_FINANCIAL_ENTRIES,'id,support_payout_case_id,currency,state','support_payout_case_id',ids)),
    safeRead('Existing Work',()=>read(TABLES.WORK_TASKS,'id,support_payout_case_id,title,status','support_payout_case_id',ids)),
  ]);
  report.workAvailable = !report.issues.some(issue=>issue.startsWith('Existing Work'));
  const shipmentLines = await safeRead('Shipment lines',()=>read(TABLES.SOURCE_SHIPMENT_LINES,'id,source_shipment_id,source_order_line_id','source_shipment_id',unique(shipments,'id')));
  // Origins are canonical locations linked through the evidenced source account and
  // exact provider location identity; arbitrary tracking places never qualify.
  const locations = await safeRead('Warehouse origins',()=>read('source_locations','id,source_account_id,external_id,name,source_record_id','source_account_id',unique(shipments,'source_account_id')));
  const accounts = await safeRead('Origin source accounts',()=>read(TABLES.SOURCE_ACCOUNTS,'id,provider_id','id',unique(shipments,'source_account_id')));
  const financialTruth = enforceFinancialTruth(finances.map(row=>({...row,known_states:entries.filter(e=>e.support_payout_case_id===row.support_payout_case_id && e.currency===row.currency).map(e=>e.state)})));
  if (financialTruth.issues.length) { report.state='partial'; report.issues.push(...financialTruth.issues); }
  const financialRows = financialTruth.rows as Row[];
  for (const row of cases) {
    const allClaimed = claimed.filter(item=>item.support_payout_case_id===row.id);
    const confirmed = claimed.filter(item=>item.support_payout_case_id===row.id && item.match_status==='confirmed');
    const affectedLines = lines.filter(line=>line.source_order_id===row.source_order_id && confirmed.some(item=>item.source_order_line_id===line.id));
    const orderShipments = shipments.filter(shipment=>shipment.source_order_id===row.source_order_id);
    // Only a unique parcel for each confirmed line, or a single parcel for the
    // entire order, supports association. Never choose newest/first of several.
    const resolved = affectedLines.map(line=>orderShipments.filter(shipment=>shipmentLines.some(link=>link.source_order_line_id===line.id && link.source_shipment_id===shipment.id)));
    const affectedShipments = orderShipments.length===1 ? orderShipments : resolved.length && resolved.every(matches=>matches.length===1) ? [...new Map(resolved.flat().map(shipment=>[shipment.id,shipment])).values()] : [];
    const origins = affectedShipments.map(shipment=>{
      // ShipBob 2026-07 shipment.location.id; the existing adapter retains
      // the original order's shipments in raw_metadata.order.shipments.
      // Never infer a location from the carrier, address or an order-level hint.
      if (!shipment.source_record_id || !accounts.some(account=>account.id===shipment.source_account_id && account.provider_id==='shipbob')) return null;
      const raw=shipment.raw_metadata;
      const candidates=Array.isArray(raw?.order?.shipments) ? raw.order.shipments.filter((item: Row)=>item && typeof item==='object' && String(item.id)===shipment.external_id) : String(raw?.id)===shipment.external_id ? [raw] : [];
      if (candidates.length!==1 || candidates[0]?.location?.id == null) return null;
      const externalId=String(candidates[0].location.id);
      const matches=locations.filter(location=>location.external_id===externalId && location.source_account_id===shipment.source_account_id && location.source_record_id);
      return matches.length===1 ? matches[0] : null;
    });
    const group = (values: Array<{key:string;label:string}>) => [...new Map(values.map(v=>[v.key,v])).values()];
    const issue = row.reason_normalized || row.claim_type;
    const money = financialRows.filter(f=>f.support_payout_case_id===row.id).map(f=>{
      const currency=normaliseCurrencyOrNull(f.currency);
      const confirmed=currency ? amount(f,'confirmed_loss_minor','confirmed_loss') : null;
      const matched=currency ? amount(f,'recovered_minor','recovered') : null;
      return {currency, confirmed, matched, net:confirmed!==null && matched!==null ? financialMetricValue(aggregateMoneyBridges([f])[0], 'final_net_loss'):null};
    });
    const itemsComplete = allClaimed.length > 0 && allClaimed.every(item=>item.match_status==='confirmed' && affectedLines.some(line=>line.id===item.source_order_line_id));
    const patternCase: PatternCase = { id:row.id, orderId:row.source_order_id??null, submittedAt:row.submitted_at, money,
      allocationEligible:{issue:Boolean(issue),sku:itemsComplete,carrier:affectedShipments.length>0 && (orderShipments.length===1 || itemsComplete),warehouse:origins.length>0 && origins.every(Boolean) && (orderShipments.length===1 || itemsComplete)},
      groups:{ issue:issue?[{key:String(issue),label:String(issue).replaceAll('_',' ')}]:[],
        sku:group(affectedLines.filter(line=>line.sku).map(line=>({key:JSON.stringify([line.sku,line.variant_ref??null]),label:`${line.sku}${line.variant_ref ? ` · ${line.variant_ref}`:''}`}))),
        carrier:affectedShipments.every(shipment=>shipment.carrier) ? group(affectedShipments.map(shipment=>({key:String(shipment.carrier).trim().toLowerCase(),label:String(shipment.carrier).trim()}))) : [],
        warehouse:origins.length && origins.every(Boolean) ? group(origins.map(location=>({key:location!.id,label:location!.name || location!.external_id}))) : [], },
      work:work.filter(task=>task.support_payout_case_id===row.id && ['open','in_progress','blocked'].includes(task.status)).map(task=>({id:task.id,title:task.title,status:task.status})),
      evidenceHrefs:affectedShipments.map(shipment=>`/shipments/${encodeURIComponent(shipment.id)}`),
    };
    report.cases.push(patternCase);
  }
  return report;
}

export function claimPatternFingerprint(report: PatternReport): string {
  return createHash('sha256').update(JSON.stringify(report)).digest('hex');
}
