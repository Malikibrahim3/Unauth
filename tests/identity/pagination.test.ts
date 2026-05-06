import fs from 'node:fs';
import path from 'node:path';

describe('blind pagination and export guards', () => {
  test('audit page summary fetch uses range pagination beyond Supabase 1000-row default', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'app/(app)/audit/[runId]/page.tsx'), 'utf8');
    expect(source).toContain('SUMMARY_BATCH');
    expect(source).toContain('.range(offset2, offset2 + SUMMARY_BATCH - 1)');
    expect(source).toContain('summaryRows.push');
    expect(source).toContain('params.runId');
  });

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

  test('duplicate upload warning ignores hidden audits so deleted dashboard runs can be re-uploaded', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'app/api/audit/route.ts'), 'utf8');
    expect(source).toContain(".eq('hidden_by_merchant' as any, false)");
  });
});
