import { Button, ButtonLink, SegmentedControl, Select, Tabs } from '@/components/ui';
import ExportMenu from '@/components/reports/ExportMenu';
import type { IntelligenceReport, ReportRange } from '@/lib/reporting/intelligence';
import { formatDateTime } from '@/lib/utils/format';

type ReportsView = 'index' | 'report' | 'records';

function hrefFor(
  path: string,
  input: { range: ReportRange; timezone: string; currency: string | null; compare: 'none' | 'previous'; report?: string | null },
  patch: Record<string, string | null> = {},
) {
  const params = new URLSearchParams({ range: input.range, timezone: input.timezone });
  if (input.currency) params.set('currency', input.currency);
  if (input.compare === 'previous' && input.range !== 'all') params.set('compare', 'previous');
  if (input.report) params.set('report', input.report);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  return `${path}?${params.toString()}`;
}

export function ReportsTabs({ view, query }: { view: ReportsView; query: Parameters<typeof hrefFor>[1] }) {
  return (
    <Tabs
      aria-label="Reports views"
      value={view}
      className="ua-reports-tabs"
      items={[
        { value: 'index', label: 'Report index', href: hrefFor('/financials/reports', query) },
        { value: 'report', label: 'Financial performance', href: hrefFor('/financials/reports/financial', query) },
        { value: 'records', label: 'Supporting records', href: hrefFor('/financials/reports/records', query, { reportId: 'financial' }) },
      ]}
    />
  );
}

export function ReportsActions({ query }: { query: Parameters<typeof hrefFor>[1] }) {
  return (
    <>
      <ButtonLink variant="secondary" size="sm" href={hrefFor('/financials/reports/records', query, { reportId: 'financial' })}>
        Supporting records
      </ButtonLink>
      <ExportMenu range={query.range} timezone={query.timezone} currency={query.currency} triggerLabel="Export this scope" triggerVariant="primary" />
    </>
  );
}

export function ReportsScope({ report, selectedCurrency, compare, reportId = null, basePath = '/financials/reports', currencies }: {
  report: IntelligenceReport;
  selectedCurrency: string | null;
  compare: 'none' | 'previous';
  reportId?: string | null;
  basePath?: string;
  currencies?: string[];
}) {
  const currencyCodes = currencies ?? report.bridges.map((bridge) => bridge.currency);
  const query = { range: report.range, timezone: report.timezone, currency: selectedCurrency, compare, report: reportId };
  const rangeItems = (['7d', '30d', '90d'] as const).map((range) => ({
    value: range,
    label: range,
    href: hrefFor(basePath, query, { range }),
  }));
  const currencyItems = [
    { value: 'separated', label: 'Separated', href: hrefFor(basePath, query, { currency: null }) },
    ...currencyCodes.map((currency) => ({ value: currency, label: currency, href: hrefFor(basePath, query, { currency }) })),
  ];
  return (
    <section className="ua-reports-scope" aria-label="Report scope">
      <div className="ua-reports-scope__controls">
        <div className="ua-reports-scope__group"><span>Range</span><SegmentedControl aria-label="Report range" value={report.range} items={[...rangeItems, { value: 'all', label: 'Custom', disabled: true }]} /></div>
        <div className="ua-reports-scope__group"><span>Currency</span><SegmentedControl aria-label="Report currency" value={selectedCurrency ?? 'separated'} items={currencyItems} /></div>
        {report.range !== 'all' ? <div className="ua-reports-scope__group"><span>Compare</span><SegmentedControl aria-label="Comparison period" value={compare} items={[
          { value: 'none', label: 'None', href: hrefFor(basePath, query, { compare: null }) },
          { value: 'previous', label: 'Previous period', href: hrefFor(basePath, query, { compare: 'previous' }) },
        ]} /></div> : null}
        <form method="get" action={basePath} className="ua-reports-scope__timezone">
          <input type="hidden" name="range" value={report.range} />
          {selectedCurrency ? <input type="hidden" name="currency" value={selectedCurrency} /> : null}
          {compare === 'previous' ? <input type="hidden" name="compare" value="previous" /> : null}
          {reportId ? <input type="hidden" name="report" value={reportId} /> : null}
          <label htmlFor="reports-timezone">Timezone</label>
          <Select id="reports-timezone" name="timezone" defaultValue={report.timezone}>
            <option value="UTC">UTC</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option>
            {!['UTC', 'Europe/London', 'America/New_York'].includes(report.timezone) ? <option value={report.timezone}>{report.timezone}</option> : null}
          </Select>
          <Button type="submit" variant="secondary" size="sm">Apply</Button>
        </form>
      </div>
      <p className="ua-reports-scope__url-note">Scope is URL-backed</p>
    </section>
  );
}

export function ReportsTrustLine({ report, selectedCurrency }: { report: IntelligenceReport; selectedCurrency: string | null }) {
  const confidence = report.reconciliation.confidence;
  return (
    <div className="ua-reports-trust" aria-label="Report scope, freshness, and exclusions">
      <span>{report.range === 'all' ? 'All recorded dates' : report.range} · {report.timezone} · {selectedCurrency ?? 'currencies separated'} · generated {formatDateTime(report.generatedAt)}</span>
      <span className="ua-reports-trust__divider" aria-hidden="true" />
      <ButtonLink variant="link" size="sm" href="/sources/connected">Data trust and coverage</ButtonLink>
      {confidence.excludedRecordCount > 0 ? <>
        <span className="ua-reports-trust__divider" aria-hidden="true" />
        <span className="ua-reports-trust__warning">△ {confidence.currencyExcludedRecordCount} excluded, mixed currency · {confidence.unreconciledExcludedRecordCount} excluded, unreconciled</span>
        <ButtonLink variant="link" size="sm" href="/financials/reconciliation">Review exclusions</ButtonLink>
      </> : null}
    </div>
  );
}
