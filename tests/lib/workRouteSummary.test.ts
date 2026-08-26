import { loadWorkRouteSummary } from '@/lib/work/store';

describe('loadWorkRouteSummary', () => {
  function queryResult(data: unknown[], count = data.length, error: { message: string } | null = null) {
    const result = { data, count, error };
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'neq', 'order', 'range']) {
      query[method] = jest.fn(() => query);
    }
    query.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
    return query;
  }

  it('combines the existing count RPC with two bounded facet scans', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        open: 3,
        mine: 1,
        unassigned: 1,
        due_today: 1,
        overdue: 1,
        no_sla: 1,
        blocked: 0,
        evidence_needed: 0,
        decision_needed: 0,
        integration_exceptions: 1,
        completed: 8,
      },
      error: null,
    });
    const taskRows = [
      { id: 'task-1', due_at: '2026-08-14T23:00:00.000Z', created_at: '2026-08-14T12:00:00.000Z' },
      { id: 'task-2', due_at: null, created_at: '2026-08-10T12:00:00.000Z' },
    ];
    const exceptionRows = [
      { id: 'exception-1', due_at: '2026-08-15T10:00:00.000Z', created_at: '2026-08-01T12:00:00.000Z' },
    ];
    const client = {
      rpc,
      from: jest.fn((table: string) => queryResult(table === 'work_tasks' ? taskRows : exceptionRows)),
    };

    const result = await loadWorkRouteSummary(
      client as never,
      'merchant-1',
      'user-1',
      new Date('2026-08-15T00:00:00.000Z'),
    );

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledTimes(2);
    expect(result?.viewCounts['integration-exceptions']).toBe(1);
    expect(result?.dueBands.overdue).toBe(1);
    expect(result?.dueBands['due-today']).toBe(1);
    expect(result?.ageBands['age-8-plus']).toBe(1);
  });

  it('returns null so the route can use its compatibility fallback', async () => {
    const client = {
      rpc: jest.fn().mockResolvedValue({ data: { open: 0 }, error: null }),
      from: jest.fn(() => queryResult([], 0, { message: 'facet query failed' })),
    };
    const result = await loadWorkRouteSummary(
      client as never,
      'merchant-1',
      'user-1',
      new Date('2026-08-15T00:00:00.000Z'),
    );

    expect(result).toBeNull();
  });
});
