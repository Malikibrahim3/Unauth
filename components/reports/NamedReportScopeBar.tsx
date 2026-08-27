import { Button, SegmentedControl, Select } from '@/components/ui';
import { WorkbenchActionBar } from '@/components/workbench/WorkbenchActionBar';
import { REPORT_RANGES, type IntelligenceReport } from '@/lib/reporting/intelligence';
import type { NamedReportId, NamedReportMeasure } from '@/lib/reporting/namedReportContracts';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';

function reportHref(input: {
  reportId: NamedReportId;
  range: IntelligenceReport['range'];
  timezone: string;
  currency?: string | null;
  measure?: NamedReportMeasure;
  page?: number;
}) {
  const params = new URLSearchParams({ range: input.range, timezone: input.timezone });
  if (input.currency) params.set('currency', input.currency);
  if (input.measure && input.measure !== 'amount') params.set('measure', input.measure);
  if (input.page && input.page > 1) params.set('page', String(input.page));
  return `/financials/reports/${input.reportId}?${params.toString()}`;
}

export function NamedReportScopeBar({
  reportId,
  report,
  availableCurrencies,
  selectedCurrency,
  measure,
  page,
}: {
  reportId: NamedReportId;
  report: IntelligenceReport;
  availableCurrencies: string[];
  selectedCurrency: string | null;
  measure: NamedReportMeasure;
  page: number;
}) {
  const actionBar = (
    <WorkbenchActionBar
          left={(
            <div className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Named report scope">
              <span className="ua-text-metadata">Date</span>
              <SegmentedControl
                aria-label="Report range"
                value={report.range}
                items={REPORT_RANGES.map((range) => ({
                  value: range,
                  label: TIME_RANGE_LABELS[range],
                  href: reportHref({ reportId, range, timezone: report.timezone, currency: selectedCurrency, measure, page }),
                }))}
              />
              <span className="ua-text-metadata ml-1">Currency</span>
              <SegmentedControl
                aria-label="Report currency"
                value={selectedCurrency ?? 'separated'}
                items={[
                  { value: 'separated', label: 'Separated', href: reportHref({ reportId, range: report.range, timezone: report.timezone, measure, page }) },
                  ...availableCurrencies.map((currency) => ({
                    value: currency,
                    label: currency,
                    href: reportHref({ reportId, range: report.range, timezone: report.timezone, currency, measure, page }),
                  })),
                ]}
              />
            </div>
          )}
          right={(
            <form method="get" action={`/financials/reports/${reportId}`} className="flex items-center gap-2">
              <input type="hidden" name="range" value={report.range} />
              {selectedCurrency ? <input type="hidden" name="currency" value={selectedCurrency} /> : null}
              {measure !== 'amount' ? <input type="hidden" name="measure" value={measure} /> : null}
              {page > 1 ? <input type="hidden" name="page" value={page} /> : null}
              <Select name="timezone" defaultValue={report.timezone} aria-label="Report timezone">
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
                {!['UTC', 'Europe/London', 'America/New_York'].includes(report.timezone) ? <option value={report.timezone}>{report.timezone}</option> : null}
              </Select>
              <Button type="submit" variant="secondary" size="sm">Apply</Button>
            </form>
          )}
    />
  );

  return (
    <>
      <div className="ua-named-report-scope-desktop">{actionBar}</div>
      <details className="ua-named-report-scope-compact">
        <summary>
          <span><strong>Report scope</strong><small>{TIME_RANGE_LABELS[report.range]} · {selectedCurrency ?? 'Currencies separated'} · {report.timezone}</small></span>
          <span>Change</span>
        </summary>
        <div>{actionBar}</div>
      </details>
    </>
  );
}
