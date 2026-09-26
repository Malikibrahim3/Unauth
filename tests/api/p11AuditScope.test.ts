import { NextRequest } from 'next/server';
const mockPermission = jest.fn();
const mockLog = jest.fn();
let source: Record<string, Array<Record<string, any>>>;
const queries: Array<{ table: string; filters: Array<[string, string, unknown]> }> = [];
const mockService = { from(table: string) {
  const entry = { table, filters: [] as Array<[string, string, unknown]> }; queries.push(entry);
  let start = 0; let end = Infinity;
  const q: any = {
    select: () => q, order: () => q,
    eq: (k: string, v: unknown) => { entry.filters.push(['eq', k, v]); return q; },
    gte: (k: string, v: unknown) => { entry.filters.push(['gte', k, v]); return q; },
    lte: (k: string, v: unknown) => { entry.filters.push(['lte', k, v]); return q; },
    in: () => q,
    range: (a: number, b: number) => { start = a; end = b + 1; return q; },
    limit: (n: number) => { end = n; return q; },
    then: (resolve: (v: unknown) => unknown) => {
      const rows = (source[table] ?? []).filter(row => entry.filters.every(([op, k, v]) => op === 'eq' ? row[k] === v : op === 'gte' ? row[k] >= v! : row[k] <= v!)).sort((a,b) => b.created_at.localeCompare(a.created_at));
      return Promise.resolve(resolve({ data: rows.slice(start, end), count: rows.length, error: null }));
    },
  }; return q;
} };
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }), createServiceClient: () => mockService }));
jest.mock('@/lib/supabase/scoped', () => ({ createScopedClient: (id: string) => ({ from: (table: string) => mockService.from(table).eq('merchant_id', id) }) }));
jest.mock('@/lib/permissions', () => ({ PERMISSIONS: { VIEW_AUDIT_TRAIL: 'view', EXPORT_AUDIT: 'export' }, requirePermission: (...args: unknown[]) => mockPermission(...args) }));
jest.mock('@/lib/permissions/audit', () => ({ logAction: (...args: unknown[]) => mockLog(...args) }));
jest.mock('@/lib/log', () => ({ createRequestLogger: () => ({ error: jest.fn() }), withRequestLogging: (_: string, fn: unknown) => fn }));
jest.mock('@/lib/testing/remainingClosureGuard', () => ({ isRemainingClosureFixtureRequest: async () => false }));
import { GET } from '@/app/api/audit-trail/route';
const request = (query: string) => new NextRequest(`http://localhost/api/audit-trail?${query}`);
beforeEach(() => {
  queries.length = 0; mockLog.mockClear();
  mockPermission.mockResolvedValue({ denied: null, ctx: { merchantId: 'm1', userId: 'u1', role: 'owner' } });
  source = { user_action_log: [], claim_events: [] };
  for (let day = 1; day <= 6; day++) {
    const table = day % 2 ? 'user_action_log' : 'claim_events';
    source[table].push({ id: `event-${day}`, merchant_id: 'm1', actor_user_id: day <= 4 ? 'u1' : 'u2', action: 'claim_decision', event_type: 'claim_decision', created_at: `2026-09-0${day}T12:00:00.000Z`, resource_type: 'claim', metadata: {} });
  }
  source.user_action_log.push({ id: 'foreign', merchant_id: 'm2', actor_user_id: 'u1', created_at: '2026-09-07T12:00:00.000Z' });
});
it('merges both streams before paginating and retains an exact total', async () => {
  const body = await (await GET(request('page=2&limit=2'))).json();
  expect(body.rows.map((r: any) => r.id)).toEqual(['event-4', 'event-3']);
  expect(body.total).toBe(6); expect(body.pages).toBe(3);
  expect(body.actorSummaryScope).toBe('loaded_page');
  expect(body.actorSummary.reduce((n: number, row: any) => n + row.count, 0)).toBe(2);
});
it('applies period, actor and action to rows, total and summary', async () => {
  const body = await (await GET(request('actorUserId=u1&action=claim_decision&startDate=2026-09-02T00:00:00Z&endDate=2026-09-04T23:59:59Z'))).json();
  expect(body.rows.map((r: any) => r.id)).toEqual(['event-4', 'event-3', 'event-2']);
  expect(body.total).toBe(3);
  expect(body.actorSummary.every((r: any) => r.actorUserId === 'u1')).toBe(true);
  expect(queries.filter(q => q.table === 'claim_events').every(q => q.filters.some(f => f[1] === 'merchant_id' && f[2] === 'm1'))).toBe(true);
});
it.each(['page=NaN', 'page=100&limit=200', 'startDate=bad', 'startDate=2026-09-06&endDate=2026-09-01'])('rejects invalid/unbounded input %s', async q => {
  expect((await GET(request(q))).status).toBe(400);
});
it('retains permission denial before reads', async () => {
  mockPermission.mockResolvedValue({ denied: new Response('Denied', { status: 403 }) });
  expect((await GET(request(''))).status).toBe(403); expect(queries).toHaveLength(0);
});
