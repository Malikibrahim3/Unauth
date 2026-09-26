import { NextResponse } from 'next/server';
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createServiceClient: jest.fn() }));
jest.mock('@/lib/permissions', () => ({ PERMISSIONS: { VIEW_SETTINGS: 'view_settings', MANAGE_SETTINGS: 'manage_settings' }, requirePermission: jest.fn() }));
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { POST } from '@/app/api/rules/[id]/publish/route';
import { signImpactProof } from '@/lib/rules/impactToken';
import { impactHash } from '@/lib/rules/impactRead';
import { mapRuleRow } from '@/lib/rules/store';
const merchantId = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const draft = { id: '33333333-3333-4333-8333-333333333333', merchant_id: merchantId, merchant_rule_id: id, version: 2, name: 'Policy', description: null, conditions: [], action: 'approve', condition_operator: 'and', priority: 1, status: 'draft' };
const candidate = mapRuleRow({ ...draft, id, is_active: true } as never);
function setup(revision = 4, count = 1) {
  const rpc = jest.fn().mockResolvedValue({ data: { ...draft, status: 'published' }, error: null });
  const from = jest.fn((table: string) => {
    const data = table === 'merchant_rule_versions' ? draft : table === 'merchant_rule_input_versions' ? { revision } : table === 'merchant_rules' ? [] : null;
    const response = { data, error: null, count };
    const chain: any = { then: (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve), maybeSingle: jest.fn().mockResolvedValue(response) };
    for (const method of ['select', 'eq', 'is', 'order']) chain[method] = jest.fn().mockReturnValue(chain);
    for (const method of ['insert', 'update', 'delete', 'upsert']) chain[method] = jest.fn(() => { throw new Error('Unexpected business write'); });
    return chain;
  });
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser: async () => ({ data: { user: { id: 'actor' } } }) } });
  (createServiceClient as jest.Mock).mockReturnValue({ from, rpc });
  (requirePermission as jest.Mock).mockResolvedValue({ denied: null, ctx: { merchantId, role: 'owner' } });
  return { rpc, from };
}
function token(overrides = {}) { return signImpactProof({ merchantId, revision: '4', target: id, proposedHash: impactHash([candidate]), expiresAt: Date.now() + 60000, evaluatedCount: 1, ...overrides }); }
function request(body: unknown) { return new Request('http://localhost/api/rules/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
async function publish(body: unknown) { return POST(request(body), { params: Promise.resolve({ id }) }); }
beforeEach(() => { jest.clearAllMocks(); process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-proof-test-secret'; });
it('review and cancellation have no publication or direct business writes', async () => {
  const { rpc } = setup(); const response = await publish({ impactToken: token() });
  expect(response.status).toBe(200); expect((await response.json()).confirmationRequired).toBe(true); expect(rpc).not.toHaveBeenCalled();
});
it('requires a fresh signed preview even with confirm true', async () => {
  const { rpc } = setup(); expect((await publish({ confirm: true, impactToken: 'forged' })).status).toBe(409); expect(rpc).not.toHaveBeenCalled();
});
it('rejects changed sources', async () => {
  const { rpc } = setup(5); expect((await publish({ confirm: true, impactToken: token() })).status).toBe(409); expect(rpc).not.toHaveBeenCalled();
});
it('rejects a changed draft or client-proposed policy', async () => {
  const { rpc } = setup(); expect((await publish({ confirm: true, impactToken: token({ proposedHash: 'other' }) })).status).toBe(409); expect(rpc).not.toHaveBeenCalled();
});
it('requires a no-case acknowledgement and passes the exact atomic revision', async () => {
  const { rpc } = setup(4, 0); const impactToken = token({ evaluatedCount: 0 });
  expect((await publish({ confirm: true, impactToken })).status).toBe(409);
  expect(rpc).not.toHaveBeenCalled();
  expect((await publish({ confirm: true, impactToken, acknowledgeNoCases: true })).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith('publish_previewed_merchant_rule', expect.objectContaining({ p_revision: '4', p_draft_id: draft.id, p_rule_id: id, p_merchant_id: merchantId, p_no_cases_ack: true }));
});
it('does not use empty-window acknowledgement when the merchant has other cases', async () => {
  const { rpc } = setup(4, 10); expect((await publish({ confirm: true, impactToken: token({ evaluatedCount: 0 }), acknowledgeNoCases: true })).status).toBe(409); expect(rpc).not.toHaveBeenCalled();
});
it('enforces manage-settings permission before reads or publication', async () => {
  const { rpc, from } = setup(); (requirePermission as jest.Mock).mockResolvedValue({ denied: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
  expect((await publish({ confirm: true, impactToken: token() })).status).toBe(403); expect(rpc).not.toHaveBeenCalled(); expect(from).not.toHaveBeenCalled();
});
it('rejects a preview from another tenant', async () => {
  const { rpc } = setup(); expect((await publish({ confirm: true, impactToken: token({ merchantId: 'other' }) })).status).toBe(409); expect(rpc).not.toHaveBeenCalled();
});
it.each(['40001', '40P01'])('asks for a fresh preview after transaction conflict %s', async code => {
  const { rpc } = setup(); rpc.mockResolvedValue({ data: null, error: { code, message: 'concurrent policy/source change' } });
  const response = await publish({ confirm: true, impactToken: token() });
  expect(response.status).toBe(409);
  expect((await response.json()).error).toContain('Preview impact again');
  expect(rpc).toHaveBeenCalledTimes(1);
});
