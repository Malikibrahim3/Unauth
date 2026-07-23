import fs from 'node:fs';
import path from 'node:path';

describe('retired merchant claim-tag configuration boundary', () => {
  const baseline = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260720000000_canonical_production_baseline.sql'),
    'utf8'
  );
  const hardening = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260722100000_tenant_authorization_hardening.sql'),
    'utf8',
  );
  const detector = fs.readFileSync(
    path.join(process.cwd(), 'lib/support/intake/tagClaimDetection.ts'),
    'utf8',
  );

  it('does not resurrect the dropped legacy table or its stale owner model', () => {
    expect(baseline).not.toContain('create table public."merchant_claim_tag_configs"');
    expect(baseline).not.toContain('merchants.user_id');
  });

  it('fails safely to reviewed defaults while the retired setting has no canonical replacement', () => {
    expect(detector).toContain('merchant_claim_tag_configs` table was dropped');
    expect(detector).toContain('requires merchant review');
    expect(detector).toContain('isDefault: true');
  });

  it('keeps canonical rule reads merchant-scoped and direct browser writes disabled', () => {
    expect(hardening).toContain('create policy merchant_rules_member_select');
    expect(hardening).toContain('using (public.is_merchant_member(merchant_id))');
    expect(hardening).toContain(
      'revoke insert, update, delete on public.merchant_rules from anon, authenticated',
    );
  });
});
