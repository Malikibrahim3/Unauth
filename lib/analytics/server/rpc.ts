import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AnalyticsDataByDomain,
  AnalyticsDomain,
  AnalyticsEnvelope,
  AnalyticsIssue,
  AnalyticsLedgerRecordsPage,
  AnalyticsScope,
} from '@/lib/analytics/contracts';

const RPC_BY_DOMAIN = {
  financial: 'get_financial_analytics',
  work: 'get_work_analytics',
  recovery: 'get_recovery_analytics',
  evidence: 'get_evidence_analytics',
  source_health: 'get_source_health_analytics',
  automation: 'get_automation_analytics',
} as const;

type RpcResult = PromiseLike<{
  data: unknown;
  error: { message: string; code?: string } | null;
}>;

type RpcInvoker = (name: string, args: Record<string, unknown>) => RpcResult;

function isIssue(value: unknown): value is AnalyticsIssue {
  if (!value || typeof value !== 'object') return false;
  const issue = value as Partial<AnalyticsIssue>;
  return typeof issue.code === 'string'
    && typeof issue.explanation === 'string'
    && Array.isArray(issue.affectedMeasures)
    && issue.affectedMeasures.every((measure) => typeof measure === 'string')
    && typeof issue.excludedRecordCount === 'number';
}

function assertEnvelope<T>(value: unknown): asserts value is AnalyticsEnvelope<T> {
  if (!value || typeof value !== 'object') throw new Error('analytics_rpc_invalid_envelope');
  const envelope = value as Partial<AnalyticsEnvelope<T>>;
  if (!('data' in envelope)) throw new Error('analytics_rpc_missing_data');
  if (typeof envelope.generatedAt !== 'string') throw new Error('analytics_rpc_missing_generated_at');
  if (envelope.sourceDataWatermark !== null && typeof envelope.sourceDataWatermark !== 'string') {
    throw new Error('analytics_rpc_invalid_watermark');
  }
  if (!['complete', 'partial', 'missing', 'unavailable'].includes(String(envelope.completeness))) {
    throw new Error('analytics_rpc_invalid_completeness');
  }
  if (!Array.isArray(envelope.issues) || !envelope.issues.every(isIssue)) {
    throw new Error('analytics_rpc_invalid_issues');
  }
  if (!Number.isSafeInteger(envelope.recordCount) || Number(envelope.recordCount) < 0) {
    throw new Error('analytics_rpc_invalid_record_count');
  }
  if (!Array.isArray(envelope.currencies) || !envelope.currencies.every((currency) => /^[A-Z]{3}$/.test(currency))) {
    throw new Error('analytics_rpc_invalid_currencies');
  }
}

export type AnalyticsServerContext = {
  /** Must be a service-role client; RPC grants reject browser roles. */
  client: SupabaseClient;
  merchantId: string;
  actorId: string;
};

export async function getAnalytics<D extends AnalyticsDomain>(
  context: AnalyticsServerContext,
  domain: D,
  scope: AnalyticsScope,
): Promise<AnalyticsEnvelope<AnalyticsDataByDomain[D]>> {
  if (!context.merchantId || !context.actorId) throw new Error('analytics_server_context_required');

  const invoke = context.client.rpc.bind(context.client) as unknown as RpcInvoker;
  const { data, error } = await invoke(RPC_BY_DOMAIN[domain], {
    p_merchant_id: context.merchantId,
    p_actor_id: context.actorId,
    p_range: scope.range,
    p_start_at: scope.start,
    p_end_at: scope.end,
    p_timezone: scope.timezone,
    p_currency: scope.currency ?? null,
    p_comparison: scope.comparison,
    p_as_of: scope.asOf,
  });

  if (error) {
    throw new Error(`analytics_rpc_${domain}_failed:${error.code ?? 'unknown'}:${error.message}`);
  }
  assertEnvelope<AnalyticsDataByDomain[D]>(data);
  return data;
}

export const getFinancialAnalytics = (context: AnalyticsServerContext, scope: AnalyticsScope) =>
  getAnalytics(context, 'financial', scope);
export const getWorkAnalytics = (context: AnalyticsServerContext, scope: AnalyticsScope) =>
  getAnalytics(context, 'work', scope);
export const getRecoveryAnalytics = (context: AnalyticsServerContext, scope: AnalyticsScope) =>
  getAnalytics(context, 'recovery', scope);
export const getEvidenceAnalytics = (context: AnalyticsServerContext, scope: AnalyticsScope) =>
  getAnalytics(context, 'evidence', scope);
export const getSourceHealthAnalytics = (context: AnalyticsServerContext, scope: AnalyticsScope) =>
  getAnalytics(context, 'source_health', scope);
export const getAutomationAnalytics = (context: AnalyticsServerContext, scope: AnalyticsScope) =>
  getAnalytics(context, 'automation', scope);

/**
 * Exact financial-chart drill-down. This reads the same immutable entry grain,
 * event-time bounds, state and currency as the chart cell; report registries
 * based on case summaries are not interchangeable with it.
 */
export async function getFinancialAnalyticsRecords(
  context: AnalyticsServerContext,
  input: { scope: AnalyticsScope; measure: string; page?: number; pageSize?: number },
): Promise<AnalyticsEnvelope<AnalyticsLedgerRecordsPage>> {
  if (!context.merchantId || !context.actorId) throw new Error('analytics_server_context_required');
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(input.pageSize ?? 50)));
  const invoke = context.client.rpc.bind(context.client) as unknown as RpcInvoker;
  const { data, error } = await invoke('get_financial_analytics_records', {
    p_merchant_id: context.merchantId,
    p_actor_id: context.actorId,
    p_start_at: input.scope.start,
    p_end_at: input.scope.end,
    p_timezone: input.scope.timezone,
    p_currency: input.scope.currency ?? null,
    p_measure: input.measure,
    p_as_of: input.scope.asOf,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw new Error(`analytics_rpc_financial_records_failed:${error.code ?? 'unknown'}:${error.message}`);
  assertEnvelope<AnalyticsLedgerRecordsPage>(data);
  return data;
}
