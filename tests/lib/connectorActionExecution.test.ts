import type { SupabaseClient } from '@supabase/supabase-js';
import { executeConnectorAction } from '@/lib/connectors/actions/execute';

const mockExecuteAction = jest.fn();
let mockAvailability = 'enabled';
jest.mock('@/lib/connectors/registry', () => ({
  getConnector: () => ({
    manifest: { capabilities: [{ id: 'tickets.write_note', risk: 'low' }] },
    executeAction: (...args: unknown[]) => mockExecuteAction(...args),
  }),
}));
jest.mock('@/lib/connectors/runtime', () => ({
  resolveCapabilityAvailability: () => ({ availability: mockAvailability, availabilityReason: mockAvailability }),
}));
jest.mock('@/lib/utils/env', () => ({ env: { GORGIAS_BOUNDED_WRITEBACK_ENABLED: 'true' } }));

const request = {
  connectionId: '00000000-0000-0000-0000-000000000001',
  capabilityId: 'tickets.write_note',
  externalRecordId: 'ticket-10',
  payload: { bodyText: 'Reviewed case' },
  idempotencyKey: 'one-logical-action',
};

function database(options: { rejectInsert?: boolean; caseExists?: boolean } = {}) {
  let run: Record<string, unknown> | null = null;
  const events: string[] = [];
  const connection = {
    id: request.connectionId, provider_id: 'gorgias', provider_account_name: 'Support',
    status: 'connected', granted_scopes: [], writeback_enabled: true,
  };
  const client = {
    from(table: string) {
      if (table === 'merchant_integrations') return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: connection, error: null }) }) }) }),
      };
      if (table === 'support_payout_cases') return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({
          data: options.caseExists === false ? null : { id: 'case-1' }, error: null,
        }) }) }) }),
      };
      if (table !== 'connector_action_runs') throw new Error(`Unexpected table: ${table}`);
      let operation: 'read' | 'insert' | 'update' = 'read';
      let value: Record<string, unknown> = {};
      const filters: Record<string, unknown> = {};
      const query = {
        select: () => query,
        eq: (key: string, expected: unknown) => { filters[key] = expected; return query; },
        insert: (input: Record<string, unknown>) => { operation = 'insert'; value = input; return query; },
        update: (input: Record<string, unknown>) => { operation = 'update'; value = input; return query; },
        async single() { return finish(); },
        async maybeSingle() { return finish(); },
      };
      function finish() {
        if (operation === 'insert') {
          events.push('intent-insert');
          if (options.rejectInsert) return { data: null, error: { code: '42501', message: 'write denied' } };
          if (run) return { data: null, error: { code: '23505', message: 'duplicate' } };
          run = { ...value, id: 'run-1' };
          return { data: { ...run }, error: null };
        }
        if (!run || Object.entries(filters).some(([key, expected]) => run?.[key] !== expected)) {
          return { data: null, error: null };
        }
        if (operation === 'update') {
          events.push(`state:${String(value.action_state)}`);
          run = { ...run, ...value };
        }
        return { data: { ...run }, error: null };
      }
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, events, getRun: () => run };
}

describe('connector action persistence boundary', () => {
  beforeEach(() => {
    mockExecuteAction.mockReset();
    mockAvailability = 'enabled';
  });

  it('persists and claims the intent before calling the provider, then replays without another call', async () => {
    const db = database();
    mockExecuteAction.mockImplementation(async () => {
      expect(db.events).toEqual(['intent-insert', 'state:provider_processing']);
      return { ok: true, reversible: false };
    });
    const first = await executeConnectorAction(db.client, 'merchant-1', 'actor-1', request);
    expect(first.action_state).toBe('provider_accepted');
    expect(first.status).toBe('previewed');
    const replay = await executeConnectorAction(db.client, 'merchant-1', 'actor-1', request);
    expect(replay).toEqual(first);
    expect(mockExecuteAction).toHaveBeenCalledTimes(1);
  });

  it('does not call the provider when intent persistence fails', async () => {
    const db = database({ rejectInsert: true });
    await expect(executeConnectorAction(db.client, 'merchant-1', 'actor-1', request))
      .rejects.toMatchObject({ code: '42501' });
    expect(mockExecuteAction).not.toHaveBeenCalled();
  });

  it('rejects a case outside the workspace before saving or dispatching', async () => {
    const db = database({ caseExists: false });
    await expect(executeConnectorAction(db.client, 'merchant-1', 'actor-1', {
      ...request, caseId: 'case-from-another-merchant',
    })).rejects.toThrow('connector_action_case_not_found');
    expect(db.events).toEqual([]);
    expect(mockExecuteAction).not.toHaveBeenCalled();
  });

  it('does not create a fake handoff when the connector action is disabled', async () => {
    const db = database();
    mockAvailability = 'merchant_disabled';
    await expect(executeConnectorAction(db.client, 'merchant-1', 'actor-1', request))
      .rejects.toThrow('connector_action_unavailable');
    expect(db.events).toEqual([]);
    expect(mockExecuteAction).not.toHaveBeenCalled();
  });

  it('keeps an ambiguous provider result and rejects changed replay payloads', async () => {
    const db = database();
    mockExecuteAction.mockRejectedValue(new Error('timeout'));
    const first = await executeConnectorAction(db.client, 'merchant-1', 'actor-1', request);
    expect(first.action_state).toBe('indeterminate');
    expect(db.getRun()?.action_state).toBe('indeterminate');
    await executeConnectorAction(db.client, 'merchant-1', 'actor-1', request);
    expect(mockExecuteAction).toHaveBeenCalledTimes(1);
    await expect(executeConnectorAction(db.client, 'merchant-1', 'actor-1', {
      ...request, payload: { bodyText: 'Different action' },
    })).rejects.toThrow('connector_action_idempotency_conflict');
  });
});
