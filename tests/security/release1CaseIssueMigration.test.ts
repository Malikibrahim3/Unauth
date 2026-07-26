import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260723150000_release1_case_issue_correction.sql',
  ),
  'utf8',
);

describe('Release 1 case issue correction', () => {
  it('is merchant-scoped, optimistic, idempotent, and audited', () => {
    expect(migration).toContain('create or replace function public.correct_case_issue');
    expect(migration).toContain('merchant_id = p_merchant_id');
    expect(migration).toContain('v_case.state_version is distinct from p_expected_version');
    expect(migration).toContain("event_type <> 'case.issue_corrected'");
    expect(migration).toContain("'case.issue_corrected'");
    expect(migration).toContain("'issue_corrected'");
  });

  it('keeps missing item precise while using the compatibility claim type', () => {
    expect(migration).toContain("when 'missing_item' then 'item_not_received'::public.claim_type");
    expect(migration).toContain('reason_normalized = p_issue');
  });

  it('is service-role only', () => {
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('to service_role');
  });
});

