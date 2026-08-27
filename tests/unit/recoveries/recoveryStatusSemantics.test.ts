import { RECOVERY_BOARD_COLUMNS, evidencePackStatus, eventTypeForStatus, nextStatusPatch } from '@/lib/recoveries/status';
import { RECOVERY_CASE_STATUSES } from '@/lib/recoveries/types';
import { markRecoveryCaseChased } from '@/lib/recoveries/store';

describe('recovery board status visibility (CR-3)', () => {
  it('every recovery status maps to exactly one visible board column', () => {
    const covered = RECOVERY_BOARD_COLUMNS.flatMap((c) => c.statuses);
    for (const status of RECOVERY_CASE_STATUSES) {
      expect(covered.filter((s) => s === status)).toHaveLength(1);
    }
  });
});

describe('recovery evidence-pack semantics', () => {
  it.each([
    [{ evidence_required: [], evidence_missing: [], evidence_complete: true }, 'not_applicable'],
    [{ evidence_required: ['tracking'], evidence_missing: [], evidence_complete: true }, 'complete'],
    [{ evidence_required: ['tracking'], evidence_missing: ['tracking'], evidence_complete: false }, 'partial'],
  ] as const)('projects %j as %s independently of lifecycle', (input, expected) => {
    expect(evidencePackStatus(input)).toBe(expected);
  });
});

describe('chase_due semantics (CR-3 / M-5)', () => {
  it('moving a case to chase_due does not record a completed chase', () => {
    expect(eventTypeForStatus('chase_due')).toBe('status_changed');
    expect(nextStatusPatch('chase_due')).not.toHaveProperty('last_chased_at');
  });
});

describe('explicit chase action (CR-3)', () => {
  function fakeClient(recoveryCase: Record<string, unknown>) {
    const events: Array<Record<string, unknown>> = [];
    const state = { recoveryCase, events };
    const client = {
      async rpc(fn: string, args: Record<string, unknown>) {
        if (fn !== 'transition_recovery_case') return { data: null, error: null };
        const fromStatus = String(state.recoveryCase.status);
        const now = '2026-07-22T12:00:00.000Z';
        state.recoveryCase = {
          ...state.recoveryCase,
          status: 'waiting_response',
          last_chased_at: now,
          next_chase_at: '2026-07-29T12:00:00.000Z',
        };
        state.events.push({
          event_type: args.p_event_type,
          from_status: fromStatus,
          to_status: 'waiting_response',
          idempotency_key: args.p_idempotency_key,
        });
        return { data: { status: 'waiting_response', replayed: false }, error: null };
      },
      from(table: string) {
        const q: Record<string, unknown> = {};
        q.select = () => q;
        q.eq = () => q;
        q.order = () => q;
        q.limit = () => q;
        q.update = (patch: Record<string, unknown>) => {
          state.recoveryCase = { ...state.recoveryCase, ...patch };
          return q;
        };
        q.insert = (row: Record<string, unknown>) => {
          state.events.push(row);
          return { select: () => ({ single: () => Promise.resolve({ data: { id: 'e1', ...row }, error: null }) }) };
        };
        q.maybeSingle = () =>
          Promise.resolve({ data: table === 'recovery_cases' ? state.recoveryCase : null, error: null });
        q.single = () =>
          Promise.resolve({ data: table === 'recovery_cases' ? state.recoveryCase : null, error: null });
        return q;
      },
    } as never;
    return { client, state };
  }

  it('records a chase, stamps last_chased_at, and returns to waiting_response', async () => {
    const { client, state } = fakeClient({
      id: 'r1',
      merchant_id: 'm1',
      status: 'chase_due',
      currency: 'GBP',
      merchant_loss_amount: 50,
      excluded_costs: [],
      last_chased_at: null,
    });

    const updated = await markRecoveryCaseChased(client, {
      merchantId: 'm1', recoveryCaseId: 'r1', idempotencyKey: 'recovery-chase-test-1',
    });

    expect(updated.status).toBe('waiting_response');
    expect(updated.last_chased_at).toBeTruthy();
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({ event_type: 'chased', to_status: 'waiting_response' });
  });
});
