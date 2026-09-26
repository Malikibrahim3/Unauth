import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createServiceClient: jest.fn() }));
jest.mock('@/lib/permissions', () => ({ PERMISSIONS: { MANAGE_SETTINGS: 'manage_settings' }, requirePermission: jest.fn() }));
jest.mock('@/lib/imports/csv/commitImport', () => ({ commitCsvImport: jest.fn() }));
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { commitCsvImport } from '@/lib/imports/csv/commitImport';
import { POST } from '@/app/api/imports/csv/commit/route';

const merchantId = 'a6000000-0000-4000-8000-000000000001';
const importId = 'a6000000-0000-4000-8000-000000000002';
const body = { import_id: importId, dataset: 'orders', mapping: { external_id: 'external_id', currency: 'currency' }, csv: 'external_id,currency\norder-1,GBP' };
let jobs: Record<string, any>;
let completionError: boolean;
let writes: number;
beforeEach(() => {
  jobs = {}; completionError = false; writes = 0;
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) } });
  (requirePermission as jest.Mock).mockResolvedValue({ denied: null, ctx: { merchantId, userId: 'user' } });
  (commitCsvImport as jest.Mock).mockResolvedValue({ persisted: 1, skipped: 0, datasetSupported: true });
  (createServiceClient as jest.Mock).mockReturnValue({ from: () => {
    let inserted: any; let update: any; const filters: Record<string, string> = {};
    const result = () => {
      if (update) {
        if (completionError && update.status === 'completed') return { data: null, error: { message: 'write unavailable' } };
        Object.assign(jobs[filters.id], update); return { data: null, error: null };
      }
      const row = jobs[filters.id];
      return { data: row?.merchant_id === filters.merchant_id ? row : null, error: null };
    };
    const query: any = {
      select: () => query, eq: (key: string, value: string) => { filters[key] = value; return query; },
      maybeSingle: async () => result(),
      insert: (value: any) => { inserted = value; return query; },
      update: (value: any) => { update = value; return query; },
      single: async () => {
        if (jobs[inserted.id]) return { data: null, error: { code: '23505' } };
        writes++; jobs[inserted.id] = inserted; return { data: { id: inserted.id }, error: null };
      },
      then: (resolve: (value: any) => void) => Promise.resolve(result()).then(resolve),
    };
    return query;
  } });
});
const request = (value = body) => new NextRequest('http://localhost/api/imports/csv/commit', { method: 'POST', body: JSON.stringify(value) });

it('arbitrates concurrent commits at the job identity and observes the same completed job on retry', async () => {
  const results = await Promise.all([POST(request()), POST(request())]);
  expect(results.map((r) => r.status).sort()).toEqual([201, 202]);
  expect(writes).toBe(1);
  expect(commitCsvImport).toHaveBeenCalledTimes(1);
  const replay = await POST(request());
  expect(replay.status).toBe(200);
  expect(await replay.json()).toMatchObject({ replayed: true, persisted: 1, job_id: importId });
  expect(commitCsvImport).toHaveBeenCalledTimes(1);
});
it('does not report completion when durable completion fails', async () => {
  completionError = true;
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ error: 'job_completion_unconfirmed', job_id: importId });
});
it('rejects changed payloads and other-tenant identity collisions without exposing their jobs', async () => {
  jobs[importId] = { id: importId, merchant_id: merchantId, job_kind: 'csv_import', file_hash: createHash('sha256').update(body.csv).digest('hex'), cursor: { dataset: 'orders' }, column_map: body.mapping, status: 'completed' };
  expect((await POST(request({ ...body, csv: body.csv + '\norder-2,GBP' }))).status).toBe(409);
  jobs[importId].merchant_id = 'other-tenant';
  const response = await POST(request());
  expect(response.status).toBe(409);
  expect(await response.json()).not.toHaveProperty('job_id');
  expect(commitCsvImport).not.toHaveBeenCalled();
});
it.each([
  { ...body, csv: 'external_id,currency\n"unterminated,GBP' },
  { ...body, dataset: 'refunds' },
])('rejects malformed or validation-only input before any job write', async (value) => {
  expect((await POST(request(value))).status).toBe(400);
  expect(writes).toBe(0);
  expect(commitCsvImport).not.toHaveBeenCalled();
});
it('enforces permission denial before job access', async () => {
  (requirePermission as jest.Mock).mockResolvedValue({ denied: new Response('{}', { status: 403 }), ctx: null });
  expect((await POST(request())).status).toBe(403);
  expect(writes).toBe(0);
});
