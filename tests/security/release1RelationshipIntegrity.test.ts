import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260723100000_release1_relationship_credential_integrity.sql',
  ),
  'utf8',
);

describe('Release 1 relationship and credential integrity', () => {
  it('enforces same-merchant partner and API-key relationships', () => {
    expect(migration).toContain('partner_recovery_rules_partner_merchant_fkey');
    expect(migration).toContain('foreign key (partner_id, merchant_id)');
    expect(migration).toContain('merchant_widget_tokens_api_key_merchant_fkey');
    expect(migration).toContain('foreign key (api_key_id, merchant_id)');
  });

  it('atomically revokes API keys and their widget tokens', () => {
    expect(migration).toContain('create or replace function public.revoke_merchant_api_key');
    expect(migration).toContain('update public.merchant_api_keys');
    expect(migration).toContain('update public.merchant_widget_tokens');
    expect(migration).toContain('to service_role');
    expect(migration).toContain('from public, anon, authenticated');
  });

  it('requires widget-token validation to check the parent key', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/api/widgetTokens.ts'),
      'utf8',
    );
    expect(source).toContain('.from(TABLES.MERCHANT_API_KEYS)');
    expect(source).toContain('apiKey.revoked_at');
  });
});
