import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/supabase/scoped', () => ({
  createScopedClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: {
    MANAGE_TEAM: 'manage_team',
    VIEW_TEAM: 'view_team',
  },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/permissions/audit', () => ({
  logAction: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission } from '@/lib/permissions';
import { GET as getTeam } from '@/app/api/team/route';
import { DELETE as deleteTeamMember } from '@/app/api/team/[memberId]/route';

type Row = Record<string, unknown>;

type QueryState = {
  hardDeleteTables: string[];
  rows: {
    merchant_members: Row[];
    merchants: Row[];
  };
  updatePayloads: Array<{ table: string; payload: Row }>;
};

function makeQuery(state: QueryState, table: keyof QueryState['rows']) {
  let operation: 'select' | 'update' | 'delete' = 'select';
  let updatePayload: Row | null = null;
  const filters: Array<(row: Row) => boolean> = [];

  const matchingRows = () => state.rows[table].filter((row) => filters.every((filter) => filter(row)));

  const resolve = () => {
    const rows = matchingRows();

    if (operation === 'update' && updatePayload) {
      for (const row of rows) Object.assign(row, updatePayload);
      return { data: rows, error: null };
    }

    if (operation === 'delete') {
      state.hardDeleteTables.push(table);
      const remaining = state.rows[table].filter((row) => !filters.every((filter) => filter(row)));
      state.rows[table] = remaining as typeof state.rows[typeof table];
      return { data: rows, error: null };
    }

    return { data: rows, error: null };
  };

  const chain: any = {
    select: jest.fn(() => {
      operation = 'select';
      return chain;
    }),
    update: jest.fn((payload: Row) => {
      operation = 'update';
      updatePayload = payload;
      state.updatePayloads.push({ table, payload });
      return chain;
    }),
    delete: jest.fn(() => {
      operation = 'delete';
      return chain;
    }),
    eq: jest.fn((column: string, value: unknown) => {
      filters.push((row) => row[column] === value);
      return chain;
    }),
    is: jest.fn((column: string, value: unknown) => {
      filters.push((row) => (value === null ? row[column] == null : row[column] === value));
      return chain;
    }),
    order: jest.fn(() => chain),
    single: jest.fn(async () => {
      const result = resolve();
      return { data: result.data[0] ?? null, error: result.error };
    }),
    maybeSingle: jest.fn(async () => {
      const result = resolve();
      return { data: result.data[0] ?? null, error: result.error };
    }),
    then: (onFulfilled: (value: { data: Row[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(resolve()).then(onFulfilled, onRejected),
  };

  return chain;
}

function makeSupabaseClient(state: QueryState) {
  return {
    from: jest.fn((table: string) => {
      if (table !== 'merchant_members' && table !== 'merchants') {
        throw new Error(`Unexpected table in soft-delete test: ${table}`);
      }
      return makeQuery(state, table);
    }),
  };
}

describe('soft-delete compliance', () => {
  let state: QueryState;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-11T12:34:56.000Z'));

    state = {
      hardDeleteTables: [],
      updatePayloads: [],
      rows: {
        merchant_members: [
          {
            id: 'member-1',
            merchant_id: 'merchant-1',
            invited_email: 'analyst@example.com',
            role: 'analyst',
            invite_status: 'active',
            created_at: '2026-05-10T09:00:00.000Z',
            deleted_at: null,
          },
        ],
        merchants: [{ id: 'merchant-1', name: 'Demo Merchant', user_id: 'user-1' }],
      },
    };

    const serviceClient = makeSupabaseClient(state);
    const scopedClient = makeSupabaseClient(state);

    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    });
    (createServiceClient as jest.Mock).mockReturnValue(serviceClient);
    (createScopedClient as jest.Mock).mockReturnValue(scopedClient);
    (requirePermission as jest.Mock).mockResolvedValue({
      denied: null,
      ctx: { userId: 'user-1', merchantId: 'merchant-1', role: 'owner', memberId: null },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('does not leave Supabase hard-delete calls in API routes', () => {
    const routeFiles = globSync('app/api/**/route.ts', { cwd: process.cwd() });
    const violations = routeFiles.filter((routeFile) => {
      const source = fs.readFileSync(path.join(process.cwd(), routeFile), 'utf8');
      return /\.from\s*\([^;]*?\.delete\s*\(/s.test(source);
    });

    expect(violations).toEqual([]);
  });

  it('soft-deletes a team member and excludes it from the team API response', async () => {
    const deleteResponse = await deleteTeamMember(
      new Request('http://localhost/api/team/member-1', {
        method: 'DELETE',
        headers: { 'x-forwarded-for': '203.0.113.10' },
      }) as any,
      { params: Promise.resolve({ memberId: 'member-1' }) }
    );

    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toEqual({ success: true });
    expect(state.hardDeleteTables).toEqual([]);
    expect(state.rows.merchant_members).toHaveLength(1);
    expect(state.updatePayloads).toEqual([
      {
        table: 'merchant_members',
        payload: { deleted_at: '2026-05-11T12:34:56.000Z' },
      },
    ]);
    expect(state.rows.merchant_members[0].deleted_at).toBe('2026-05-11T12:34:56.000Z');

    const getResponse = await getTeam();
    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toMatchObject({ members: [] });
  });
});
