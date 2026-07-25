import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260723600000_release1_reporting_truthfulness.sql',
  ),
  'utf8',
);

describe('Release 1 reporting truthfulness migration', () => {
  it('uses the normalized issue before the compatibility claim type', () => {
    expect(migration).toContain("nullif(trim(payout_case.reason_normalized), '')");
    expect(migration).toContain(
      "in ('missing_item', 'wrong_item', 'damaged', 'not_as_described')",
    );
  });

  it('keeps financial drill-down service-role only', () => {
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('to service_role');
  });
});
