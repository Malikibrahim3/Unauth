import { findBestPartnerRecoveryRule } from '@/lib/partners/store';
import { createRecoveryCase, updateRecoveryCaseStatus } from '@/lib/recoveries/store';

class FakeQuery {
  constructor(
    private table: string,
    private state: {
      recoveryCase: Record<string, unknown>;
      rules: Array<Record<string, unknown>>;
      insertedEvents: Array<Record<string, unknown>>;
    },
  ) {}

  select() { return this; }
  eq() { return this; }
  order() { return this; }
  limit() { return this; }

  update(patch: Record<string, unknown>) {
    this.state.recoveryCase = { ...this.state.recoveryCase, ...patch };
    return this;
  }

  insert(row: Record<string, unknown>) {
    const event = { id: `event-${this.state.insertedEvents.length + 1}`, ...row, created_at: '2026-06-19T00:00:00.000Z' };
    this.state.insertedEvents.push(event);
    return new FakeSingle(event);
  }

  maybeSingle() {
    if (this.table === 'recovery_cases') return Promise.resolve({ data: this.state.recoveryCase, error: null });
    return Promise.resolve({ data: null, error: null });
  }

  single() {
    if (this.table === 'recovery_cases') return Promise.resolve({ data: this.state.recoveryCase, error: null });
    return Promise.resolve({ data: null, error: null });
  }

  then(resolve: (value: { data: unknown[]; error: null }) => void) {
    if (this.table === 'partner_recovery_rules') {
      resolve({ data: this.state.rules, error: null });
      return;
    }
    resolve({ data: [], error: null });
  }
}

class FakeSingle {
  constructor(private row: Record<string, unknown>) {}
  select() { return this; }
  single() { return Promise.resolve({ data: this.row, error: null }); }
}

function fakeClient(state: ConstructorParameters<typeof FakeQuery>[1]) {
  return {
    from(table: string) {
      return new FakeQuery(table, state);
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      if (fn !== 'transition_recovery_case') return { data: null, error: null };
      const fromStatus = String(state.recoveryCase.status);
      const toStatus = String(args.p_status);
      state.recoveryCase = {
        ...state.recoveryCase,
        status: toStatus,
        next_chase_at: toStatus === 'submitted' ? '2026-06-26T00:00:00.000Z' : state.recoveryCase.next_chase_at,
      };
      state.insertedEvents.push({
        id: `event-${state.insertedEvents.length + 1}`,
        merchant_id: args.p_merchant_id,
        recovery_case_id: args.p_recovery_case_id,
        event_type: args.p_event_type,
        from_status: fromStatus,
        to_status: toStatus,
        note: args.p_note,
        idempotency_key: args.p_idempotency_key,
      });
      return { data: { status: toStatus, replayed: false }, error: null };
    },
  } as never;
}

describe('recovery store', () => {
  it('updates status and creates an audit event', async () => {
    const state = {
      recoveryCase: {
        id: '00000000-0000-0000-0000-000000000020',
        merchant_id: '00000000-0000-0000-0000-000000000001',
        support_payout_case_id: '00000000-0000-0000-0000-000000000010',
        partner_id: null,
        recovery_type: 'carrier_claim',
        owner_type: 'carrier',
        status: 'ready_to_submit',
        merchant_loss_amount: 80,
        eligible_loss_amount: 80,
        estimated_recoverable_min: 20,
        estimated_recoverable_max: 60,
        amount_recovered: null,
        currency: 'GBP',
        deadline_at: null,
        next_chase_at: null,
        last_chased_at: null,
        evidence_required: ['tracking'],
        evidence_missing: [],
        evidence_complete: true,
        rejection_reason: null,
        calculation_reason: [],
        excluded_costs: [],
        internal_owner_user_id: null,
        created_at: '2026-06-19T00:00:00.000Z',
        updated_at: '2026-06-19T00:00:00.000Z',
      },
      rules: [],
      insertedEvents: [],
    };

    const updated = await updateRecoveryCaseStatus(fakeClient(state), {
      merchantId: '00000000-0000-0000-0000-000000000001',
      recoveryCaseId: '00000000-0000-0000-0000-000000000020',
      status: 'submitted',
      idempotencyKey: 'recovery-status-test-1',
    });

    expect(updated.status).toBe('submitted');
    expect(updated.next_chase_at).toBeTruthy();
    expect(state.insertedEvents).toHaveLength(1);
    expect(state.insertedEvents[0]).toMatchObject({
      event_type: 'submitted',
      from_status: 'ready_to_submit',
      to_status: 'submitted',
    });
  });

  const baseCreateInput = {
    merchant_id: '00000000-0000-0000-0000-000000000001',
    support_payout_case_id: '00000000-0000-0000-0000-000000000010',
    recovery_type: 'carrier_claim' as const,
    owner_type: 'carrier' as const,
    merchant_loss_amount: 80,
    currency: 'GBP',
  };

  it('requires a canonical loss_case_id unless prevention_only', async () => {
    const state = { recoveryCase: {}, rules: [], insertedEvents: [] };
    await expect(createRecoveryCase(fakeClient(state), { ...baseCreateInput })).rejects.toThrow(
      /requires a canonical loss_case_id/,
    );
  });

  it('persists loss_case_id when linked to a canonical loss record', async () => {
    const state = { recoveryCase: {}, rules: [], insertedEvents: [] };
    const created = await createRecoveryCase(fakeClient(state), { ...baseCreateInput, loss_case_id: '00000000-0000-0000-0000-0000000000aa' });
    expect(created.loss_case_id).toBe('00000000-0000-0000-0000-0000000000aa');
  });
});

describe('partner recovery rule matching', () => {
  it('prefers a partner-specific active rule over a default rule', async () => {
    const state = {
      recoveryCase: {},
      insertedEvents: [],
      rules: [
        {
          id: 'default-rule',
          merchant_id: '00000000-0000-0000-0000-000000000001',
          partner_id: null,
          rule_name: 'Default carrier rule',
          recovery_type: 'carrier_claim',
          applies_to_claim_type: 'item_not_received',
          claimable_costs: [],
          excluded_costs: [],
          required_evidence: ['tracking'],
          deadline_days: null,
          liability_cap_amount: null,
          liability_cap_currency: null,
          liability_cap_basis: null,
          submission_method: null,
          submission_url: null,
          submission_email: null,
          source_type: 'merchant_configured',
          confidence: 'medium',
          active: true,
          created_at: '2026-06-19T00:00:00.000Z',
          updated_at: '2026-06-19T00:00:00.000Z',
        },
        {
          id: 'partner-rule',
          merchant_id: '00000000-0000-0000-0000-000000000001',
          partner_id: '00000000-0000-0000-0000-000000000002',
          rule_name: 'Named carrier rule',
          recovery_type: 'carrier_claim',
          applies_to_claim_type: 'item_not_received',
          claimable_costs: [],
          excluded_costs: [],
          required_evidence: ['tracking', 'proof_of_value'],
          deadline_days: 14,
          liability_cap_amount: null,
          liability_cap_currency: null,
          liability_cap_basis: null,
          submission_method: null,
          submission_url: null,
          submission_email: null,
          source_type: 'merchant_configured',
          confidence: 'high',
          active: true,
          created_at: '2026-06-19T00:00:00.000Z',
          updated_at: '2026-06-19T00:00:00.000Z',
        },
      ],
    };

    const rule = await findBestPartnerRecoveryRule(fakeClient(state), {
      merchantId: '00000000-0000-0000-0000-000000000001',
      recoveryType: 'carrier_claim',
      claimType: 'item_not_received',
      partnerId: '00000000-0000-0000-0000-000000000002',
    });

    expect(rule?.id).toBe('partner-rule');
  });
});
