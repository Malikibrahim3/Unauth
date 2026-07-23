import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('merchant ownership transfer contract', () => {
  const migration = read('supabase/migrations/20260722500000_ownership_transfer_integrity.sql');
  const route = read('app/api/team/[memberId]/route.ts');
  const client = read('components/settings/TeamManagementClient.tsx');

  it('enforces exactly one active owner at transaction commit', () => {
    expect(migration).toContain('merchant_users_one_active_owner');
    expect(migration).toContain('create constraint trigger trg_merchant_owner_cardinality');
    expect(migration).toContain('deferrable initially deferred');
    expect(migration).toContain('merchant_requires_exactly_one_active_owner');
    expect(migration).toContain('merchant_users_owner_is_active');
  });

  it('uses one service-only atomic and idempotent transfer operation', () => {
    expect(migration).toContain('transfer_merchant_ownership');
    expect(migration).toContain("'workspace.ownership_transferred'");
    expect(migration).toContain("set role = 'admin'::public.member_role");
    expect(migration).toContain("set role = 'owner'::public.member_role");
    expect(migration).toContain('ownership_transfer_idempotency_conflict');
    expect(migration).toContain('to service_role');
    expect(migration).toContain('from public, anon, authenticated');
  });

  it('requires an explicit confirmed UI action and idempotency key', () => {
    expect(route).toContain("req.headers.get('idempotency-key')");
    expect(route).toContain('confirmOwnershipTransfer');
    expect(route).toContain("'transfer_merchant_ownership'");
    expect(route).toContain('The owner role cannot be changed directly');
    expect(client).toContain('Transfer workspace ownership?');
    expect(client).toContain("transferConfirmation !== 'TRANSFER'");
    expect(client).toContain("'Idempotency-Key': idempotencyKey");
  });
});
