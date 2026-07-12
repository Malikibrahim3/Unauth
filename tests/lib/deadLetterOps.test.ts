jest.mock('@/lib/events/handlers/registry', () => ({
  DOMAIN_EVENT_HANDLERS: { caseProjection: jest.fn() },
}));

import {
  retryDeadLetterDelivery,
  ignoreDeadLetterDelivery,
  replayDeadLetterDelivery,
} from '@/lib/events/deadLetterOps';
import { DOMAIN_EVENT_HANDLERS } from '@/lib/events/handlers/registry';

const MERCHANT = 'm-1';

/**
 * Minimal query-builder mock. `delivery` is what a scoped maybeSingle resolves to;
 * `event` is what the domain_events read resolves to. Update calls are captured.
 */
function makeClient(opts: { delivery?: Record<string, unknown> | null; event?: Record<string, unknown> | null } = {}) {
  const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];
  const client = {
    updates,
    rpcCalls,
    from(table: string) {
      let pendingUpdate: Record<string, unknown> | null = null;
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const m of ['select', 'eq', 'in', 'order', 'limit']) builder[m] = chain;
      builder.update = (patch: Record<string, unknown>) => { pendingUpdate = patch; return builder; };
      builder.maybeSingle = async () => {
        if (table === 'domain_events') return { data: opts.event ?? null, error: null };
        return { data: opts.delivery ?? null, error: null };
      };
      // Terminal await on an update chain resolves after recording the patch.
      builder.then = (resolve: (v: unknown) => unknown) => {
        if (pendingUpdate) updates.push({ table, patch: pendingUpdate });
        return resolve({ data: null, error: null });
      };
      return builder;
    },
    rpc: async (fn: string, args: unknown) => { rpcCalls.push({ fn, args }); return { data: null, error: null }; },
  };
  return client as never as import('@supabase/supabase-js').SupabaseClient & { updates: typeof updates; rpcCalls: typeof rpcCalls };
}

describe('dead-letter operations', () => {
  afterEach(() => jest.clearAllMocks());

  it('retry resets a dead_letter delivery to pending with attempts cleared', async () => {
    const client = makeClient({ delivery: { id: 'd-1', domain_event_id: 'e-1', handler_name: 'caseProjection', status: 'dead_letter' } });
    const result = await retryDeadLetterDelivery(client, MERCHANT, 'd-1');
    expect(result).toEqual({ ok: true, status: 'pending' });
    expect(client.updates[0].patch).toMatchObject({ status: 'pending', attempts: 0, last_error: null });
  });

  it('refuses to retry a delivery that is not failed/dead_letter', async () => {
    const client = makeClient({ delivery: { id: 'd-1', domain_event_id: 'e-1', handler_name: 'caseProjection', status: 'completed' } });
    const result = await retryDeadLetterDelivery(client, MERCHANT, 'd-1');
    expect(result).toEqual({ ok: false, reason: 'not_workable' });
    expect(client.updates).toHaveLength(0);
  });

  it('ignore marks a dead_letter delivery ignored', async () => {
    const client = makeClient({ delivery: { id: 'd-2', domain_event_id: 'e-2', handler_name: 'caseProjection', status: 'dead_letter' } });
    const result = await ignoreDeadLetterDelivery(client, MERCHANT, 'd-2');
    expect(result).toEqual({ ok: true, status: 'ignored' });
    expect(client.updates[0].patch).toMatchObject({ status: 'ignored' });
  });

  it('returns not_found when the delivery is missing or cross-merchant', async () => {
    const client = makeClient({ delivery: null });
    expect(await retryDeadLetterDelivery(client, MERCHANT, 'nope')).toEqual({ ok: false, reason: 'not_found' });
  });

  it('replay runs the handler and completes on success', async () => {
    const client = makeClient({
      delivery: { id: 'd-3', domain_event_id: 'e-3', handler_name: 'caseProjection', status: 'dead_letter' },
      event: { id: 'e-3', merchant_id: MERCHANT, event_type: 'case.updated', payload: {} },
    });
    (DOMAIN_EVENT_HANDLERS.caseProjection as jest.Mock).mockResolvedValue(undefined);
    const result = await replayDeadLetterDelivery(client, MERCHANT, 'd-3');
    expect(result).toEqual({ ok: true, status: 'completed' });
    expect(DOMAIN_EVENT_HANDLERS.caseProjection).toHaveBeenCalled();
    expect(client.rpcCalls.some((c) => c.fn === 'complete_domain_event_delivery')).toBe(true);
  });

  it('replay records failure when the handler throws', async () => {
    const client = makeClient({
      delivery: { id: 'd-4', domain_event_id: 'e-4', handler_name: 'caseProjection', status: 'dead_letter' },
      event: { id: 'e-4', merchant_id: MERCHANT, event_type: 'case.updated', payload: {} },
    });
    (DOMAIN_EVENT_HANDLERS.caseProjection as jest.Mock).mockRejectedValue(new Error('boom'));
    const result = await replayDeadLetterDelivery(client, MERCHANT, 'd-4');
    expect(result.ok).toBe(false);
    expect(client.rpcCalls.some((c) => c.fn === 'fail_domain_event_delivery')).toBe(true);
  });
});
