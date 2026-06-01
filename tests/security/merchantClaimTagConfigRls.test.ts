import fs from 'node:fs';
import path from 'node:path';

describe('merchant_claim_tag_configs RLS migration', () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260601090000_tag_based_claim_detection.sql'),
    'utf8'
  );

  it('enables RLS and scopes authenticated access to the merchant owner or active team members', () => {
    expect(migration).toContain('ALTER TABLE public.merchant_claim_tag_configs ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('merchant_claim_tag_configs_select_own');
    expect(migration).toContain('merchant_claim_tag_configs_write_own');
    expect(migration).toContain('SELECT id FROM public.merchants WHERE user_id = auth.uid()');
    expect(migration).toContain("WHERE user_id = auth.uid() AND invite_status = 'active'");
  });
});
