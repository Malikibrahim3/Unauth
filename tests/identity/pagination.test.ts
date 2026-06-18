import fs from 'node:fs';
import path from 'node:path';

describe('blind pagination and export guards', () => {
  test('audit export must not be capped or use stale risk fields', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'app/api/audit/[runId]/export/route.ts'), 'utf8');
    expect(source).toContain('expectedTotalRows');
    expect(source).toContain(".order('id', { ascending: true })");
    expect(source).toContain('rows.length >= expectedTotalRows');
    expect(source).toContain('identity_confidence_grade');
    expect(source).toContain('identity_score');
    expect(source).toContain('cluster_id');
    expect(source).toContain('signals_matched');
    expect(source).not.toContain(".in('risk_level'");
    expect(source).not.toContain('.limit(10000)');
    expect(source).not.toContain(".not('identity_confidence_grade', 'is', null)");
  });
});
