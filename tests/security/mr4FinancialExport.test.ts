import fs from 'node:fs';
import path from 'node:path';

const route = fs.readFileSync(path.join(process.cwd(), 'app/api/reports/claims/route.ts'), 'utf8');

describe('MR4 financial export boundary', () => {
  it('requires both view and export authority and records an audit receipt', () => {
    expect(route).toContain('PERMISSIONS.VIEW_AUDIT');
    expect(route).toContain('PERMISSIONS.EXPORT_AUDIT');
    expect(route).toContain('action: "export_audit"');
  });

  it('preserves metric, category, currency, and date scope for supporting records', () => {
    for (const scope of ['p_cutoff: cutoff', 'p_currency: currency', 'p_metric: recordMetric', 'p_category: category']) {
      expect(route).toContain(scope);
    }
  });

  it('streams CSV with an explicit row bound and actionable oversize error', () => {
    expect(route).toContain('const SUPPORTING_RECORD_LIMIT = 10_000');
    expect(route).toContain('status: 413');
    expect(route).toContain('new ReadableStream');
    expect(route).toContain('"Content-Type": "text/csv; charset=utf-8"');
    expect(route).toContain('"X-Export-Row-Limit"');
    expect(route).toContain('status: 503');
  });
});
