import { createHash } from 'node:crypto';
import { TABLES } from '@/lib/supabase/tables';
import type { IntelligenceReport, ReportRange } from '@/lib/reporting/intelligence';
import type { NamedReportId, NamedReportMeasure } from '@/lib/reporting/namedReportContracts';

export type ReportRunScope = {
  range: ReportRange;
  timezone: string;
  currency: string | null;
  measure: NamedReportMeasure;
};

export type PersistedReportRun = {
  id: string;
  reportDefinitionId: NamedReportId;
  scope: ReportRunScope;
  snapshot: IntelligenceReport;
  recordCount: number;
  generatedAt: string;
  createdAt: string;
  domainEventId: string | null;
};

type QueryClient = { from: (table: string) => any };

export function reportRunScopeHash(scope: ReportRunScope) {
  return createHash('sha256').update(JSON.stringify(scope)).digest('hex');
}

export function scopeIntelligenceReport(report: IntelligenceReport, currency: string | null) {
  if (!currency) return report;
  return {
    ...report,
    bridges: report.bridges.filter((bridge) => bridge.currency === currency),
    trend: report.trend.filter((point) => point.currency === currency),
    causes: report.causes.filter((row) => row.currency === currency),
    recoveries: report.recoveries.filter((row) => row.currency === currency),
    operations: report.operations.map((row) => ({
      ...row,
      exposureByCurrency: row.exposureByCurrency.filter((entry) => entry.currency === currency),
    })),
  } satisfies IntelligenceReport;
}

export async function loadLatestReportRun(
  client: QueryClient,
  merchantId: string,
  reportDefinitionId: NamedReportId,
  scope: ReportRunScope,
): Promise<PersistedReportRun | null> {
  const result = await client
    .from(TABLES.REPORT_RUN_SNAPSHOTS)
    .select('id,report_definition_id,scope,snapshot,record_count,generated_at,created_at,domain_event_id')
    .eq('merchant_id', merchantId)
    .eq('report_definition_id', reportDefinitionId)
    .eq('scope_hash', reportRunScopeHash(scope))
    .order('generated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error || !result.data) return null;
  const row = result.data as Record<string, unknown>;
  return {
    id: String(row.id),
    reportDefinitionId: row.report_definition_id as NamedReportId,
    scope: row.scope as ReportRunScope,
    snapshot: row.snapshot as IntelligenceReport,
    recordCount: Number(row.record_count),
    generatedAt: String(row.generated_at),
    createdAt: String(row.created_at),
    domainEventId: typeof row.domain_event_id === 'string' ? row.domain_event_id : null,
  };
}
