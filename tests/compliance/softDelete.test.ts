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
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission } from '@/lib/permissions';
import { GET as getTeam } from '@/app/api/team/route';
import { DELETE as deleteTeamMember } from '@/app/api/team/[memberId]/route';

type Row = Record<string, unknown>;

type QueryState = {
  hardDeleteTables: string[];
  rows: Record<string, Row[]>;
  updatePayloads: Array<{ table: string; payload: Row }>;
};

function makeQuery(state: QueryState, table: string) {
  let operation: 'select' | 'update' | 'delete' = 'select';
  let updatePayload: Row | null = null;
  const filters: Array<(row: Row) => boolean> = [];

  const tableRows = () => (state.rows[table] ??= []);
  const matchingRows = () => tableRows().filter((row) => filters.every((filter) => filter(row)));

  const resolve = () => {
    const rows = matchingRows();

    if (operation === 'update' && updatePayload) {
      for (const row of rows) Object.assign(row, updatePayload);
      return { data: rows, error: null };
    }

    if (operation === 'delete') {
      state.hardDeleteTables.push(table);
      state.rows[table] = tableRows().filter((row) => !filters.every((filter) => filter(row)));
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
    neq: jest.fn((column: string, value: unknown) => {
      filters.push((row) => row[column] !== value);
      return chain;
    }),
    is: jest.fn((column: string, value: unknown) => {
      filters.push((row) => (value === null ? row[column] == null : row[column] === value));
      return chain;
    }),
    in: jest.fn((column: string, values: unknown[]) => {
      filters.push((row) => Array.isArray(values) && values.includes(row[column]));
      return chain;
    }),
    limit: jest.fn(() => chain),
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
    from: jest.fn((table: string) => makeQuery(state, table)),
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
        [TABLES.MERCHANT_MEMBERS]: [
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
        [TABLES.MERCHANTS]: [{ id: 'merchant-1', name: 'Demo Merchant', user_id: 'user-1' }],
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
    // Routes where a hard delete is intentional and compliant — NOT a soft-delete
    // violation. Each was audited:
    //   • api-keys: rollback of a just-created key row when the dependent widget
    //     token insert fails (the row should never have existed).
    //   • account/delete: full account erasure (GDPR right-to-be-forgotten).
    //   • cron/purge-expired-audits: retention purge of expired audit data.
    //   • rules/[id]: deletes a merchant-authored rule config row (not PII or an
    //     audit record); rule removal is a hard delete by design, gated by
    //     risk-score policy coverage checks before the delete runs.
    const INTENTIONAL_HARD_DELETE = new Set([
      'app/api/settings/api-keys/route.ts',
      'app/api/account/delete/route.ts',
      'app/api/cron/purge-expired-audits/route.ts',
      'app/api/rules/[id]/route.ts',
    ]);
    const routeFiles = globSync('app/api/**/route.ts', { cwd: process.cwd() });
    const violations = routeFiles.filter((routeFile) => {
      if (INTENTIONAL_HARD_DELETE.has(routeFile)) return false;
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
    // Soft-delete: the row is retained (no hard delete) and excluded from the
    // team response. The canonical mechanism is invite_status = 'revoked'
    // (GET /api/team filters .neq('invite_status', 'revoked')); the removal
    // timestamp is captured in the audit log, not on the row.
    expect(state.hardDeleteTables).toEqual([]);
    expect(state.rows[TABLES.MERCHANT_MEMBERS]).toHaveLength(1);
    expect(state.updatePayloads).toEqual([
      {
        table: TABLES.MERCHANT_MEMBERS,
        payload: { invite_status: 'revoked' },
      },
    ]);
    expect(state.rows[TABLES.MERCHANT_MEMBERS][0].invite_status).toBe('revoked');

    const getResponse = await getTeam();
    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toMatchObject({ members: [] });
  });
});
