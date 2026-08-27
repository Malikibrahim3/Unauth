/**
 * Shared analytics truth contracts.
 *
 * These types intentionally contain no merchant identifier. Tenant identity is
 * resolved on the server and passed separately to service-role RPCs; it must
 * never become browser URL state or chart metadata.
 */

export const ANALYTICS_RANGE_KEYS = ['7d', '30d', '90d', '12m', 'custom'] as const;
export type AnalyticsRangeKey = (typeof ANALYTICS_RANGE_KEYS)[number];

export const ANALYTICS_COMPARISONS = ['none', 'previous_period', 'previous_year'] as const;
export type AnalyticsComparison = (typeof ANALYTICS_COMPARISONS)[number];

export type AnalyticsCompleteness = 'complete' | 'partial' | 'missing' | 'unavailable';
export type AnalyticsValueQuality = 'known' | 'partial' | 'missing';

export type AnalyticsScope = {
  range: AnalyticsRangeKey;
  /** Inclusive ISO-8601 instant. */
  start: string;
  /** Exclusive ISO-8601 instant. */
  end: string;
  timezone: string;
  currency?: string;
  comparison: AnalyticsComparison;
  /** Stable server-generated read boundary shared by every domain request. */
  asOf: string;
};

export type AnalyticsScopeInput = {
  range?: AnalyticsRangeKey;
  start?: string;
  end?: string;
  timezone: string;
  currency?: string | null;
  comparison?: AnalyticsComparison;
};

export type AnalyticsIssue = {
  code: string;
  explanation: string;
  affectedMeasures: string[];
  excludedRecordCount: number;
};

export type AnalyticsValue = {
  value: number | null;
  quality: AnalyticsValueQuality;
};

export type AnalyticsRecordLink = {
  href: string;
  label: string;
};

export type AnalyticsSeriesCell = AnalyticsValue & {
  key: string;
  label: string;
  start: string;
  end: string;
  measure: string;
  currency?: string | null;
  records: AnalyticsRecordLink;
};

export type AnalyticsMatrixCell = AnalyticsValue & {
  rowKey: string;
  rowLabel: string;
  columnKey: string;
  columnLabel: string;
  currency?: string | null;
  records: AnalyticsRecordLink;
};

export type AnalyticsLedgerRecord = {
  id: string;
  caseId: string | null;
  lossId: string | null;
  recoveryId: string | null;
  state: string;
  amountMinor: number;
  currency: string;
  effectiveAt: string;
  recordedAt: string;
  reversesEntryId: string | null;
};

export type AnalyticsLedgerRecordsPage = {
  records: AnalyticsLedgerRecord[];
  totalCount: number;
  signedTotalMinor: number;
  measure: string;
  start: string;
  end: string;
  currency: string;
};

export type AnalyticsEnvelope<T> = {
  data: T;
  generatedAt: string;
  sourceDataWatermark: string | null;
  completeness: AnalyticsCompleteness;
  issues: AnalyticsIssue[];
  recordCount: number;
  /** Empty for non-financial domains; never implies a default currency. */
  currencies: string[];
};

export type FinancialAnalyticsData = {
  series: AnalyticsSeriesCell[];
  drilldownRoute: '/financials/reports/records';
};

export type WorkAnalyticsData = {
  flow: AnalyticsSeriesCell[];
  dueBands: AnalyticsMatrixCell[];
  drilldownRoute: '/work';
};

export type RecoveryAnalyticsData = {
  valueSeries: AnalyticsSeriesCell[];
  stageSeries: AnalyticsSeriesCell[];
  drilldownRoute: '/financials/recovery';
};

export type EvidenceAnalyticsData = {
  readiness: AnalyticsMatrixCell[];
  missingEvidence: AnalyticsMatrixCell[];
  drilldownRoute: '/cases';
};

export type SourceHealthAnalyticsData = {
  eventSeries: AnalyticsSeriesCell[];
  sourceMatrix: AnalyticsMatrixCell[];
  drilldownRoute: '/sources/connected';
};

export type AutomationAnalyticsData = {
  ruleSeries: AnalyticsSeriesCell[];
  runSeries: AnalyticsSeriesCell[];
  drilldownRoute: '/controls';
};

export type AnalyticsDomain =
  | 'financial'
  | 'work'
  | 'recovery'
  | 'evidence'
  | 'source_health'
  | 'automation';

export type AnalyticsDataByDomain = {
  financial: FinancialAnalyticsData;
  work: WorkAnalyticsData;
  recovery: RecoveryAnalyticsData;
  evidence: EvidenceAnalyticsData;
  source_health: SourceHealthAnalyticsData;
  automation: AutomationAnalyticsData;
};
