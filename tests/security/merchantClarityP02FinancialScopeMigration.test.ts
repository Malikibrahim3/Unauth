import fs from 'node:fs';
import path from 'node:path';

const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260906120000_merchant_clarity_p02_financial_scope.sql'), 'utf8');

describe('merchant clarity P02 financial scope migration', () => {
  it('applies explicit inclusive/exclusive period bounds and separates earlier work', () => {
    expect(sql).toContain('e.created_at >= p_from');
    expect(sql).toContain('e.created_at < p_to');
    expect(sql).toContain("'earlier_outstanding_count'");
    expect(sql).toContain("'start_inclusive_end_exclusive'");
  });

  it('snapshots only source-observed or receipt-backed credits by exact stage', () => {
    expect(sql).toContain("observation_authority in ('source_observed', 'receipt_backed_manual')");
    expect(sql).toContain("match_status = 'matched'");
    expect(sql).toContain("reconciliation_status = 'received_unreconciled'");
    expect(sql).toContain("reconciliation_status = 'reconciled'");
    expect(sql).toContain("case when credit_type = 'reversal' then -amount_minor else amount_minor end");
  });

  it('keeps the new RPCs service-only', () => {
    expect(sql).toContain('revoke all on function public.reconciliation_page_v2');
    expect(sql).toContain('grant execute on function public.financial_period_preview_v1');
    expect(sql).not.toMatch(/grant execute on function public\.(?:reconciliation_page_v2|financial_period_preview_v1).*authenticated/i);
  });
});
