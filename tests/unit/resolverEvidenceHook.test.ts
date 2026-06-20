import { refreshIdentityProfile } from '@/lib/identity/resolver';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NOW = Date.UTC(2026, 5, 17);
const daysAgo = (n: number) => new Date(NOW - n * MS_PER_DAY).toISOString();

type Resp = { data?: unknown; error?: unknown };
interface TableConfig {
  single?: Resp;
  list?: Resp;
  upsert?: Resp;
}
interface Capture {
  table: string;
  payload: Record<string, unknown>;
}

// Chainable Supabase-shaped fake. Returned as `any` so it can stand in for the
// resolver's SupabaseClient<any> parameter without an `as any` cast.
function makeClient(config: Record<string, TableConfig>, capture: Capture[]): any {
  return {
    from(table: string) {
      const cfg = config[table] ?? {};
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve(cfg.single ?? { data: null, error: null }),
        upsert: (payload: Record<string, unknown>) => {
          capture.push({ table, payload });
          return Promise.resolve(cfg.upsert ?? { error: null });
        },
        then: (resolve: (v: Resp) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(cfg.list ?? { data: [], error: null }).then(resolve, reject),
      };
      return builder;
    },
  };
}

const ctx = { orderIds: [] as string[], merchantCount: 2, fs: null, ls: null };

describe('resolver evidence-score hook (refreshIdentityProfile)', () => {
  // The recency factor is wall-clock relative: the resolver hook calls
  // recomputeIdentityEvidenceScore without a nowMs override, so it would
  // otherwise read the real Date.now(). Pin "now" to the same NOW the fixtures
  // are built from, so daysAgo(5) is deterministically 5 days — keeping the
  // recency tier at the full 20 points regardless of the real date the suite runs.
  let nowSpy: jest.SpyInstance;
  beforeAll(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterAll(() => {
    nowSpy.mockRestore();
  });

  it('refreshes the cached evidence score after the rollup upsert', async () => {
    const capture: Capture[] = [];
    const client = makeClient(
      {
        // refreshIdentityProfile reads claims (awaited list) then upserts identity_profiles.
        support_payout_cases: {
          list: { data: [{ claim_type: 'chargeback', source_order_id: null, submitted_at: daysAgo(5) }], error: null },
          single: { data: { submitted_at: daysAgo(5) }, error: null }, // recompute recency read
        },
        identity_profiles: {
          upsert: { error: null }, // rollup write
          single: { data: { total_claims: 2, merchant_count: 2, claim_type_counts: { chargeback: 1, damaged: 1 } }, error: null },
        },
        merchant_identity_state: { list: { data: [], error: null } },
        identity_evidence_scores: { upsert: { error: null } },
      },
      capture,
    );

    await expect(refreshIdentityProfile(client, 'id-1', ctx)).resolves.toBeUndefined();

    const rollup = capture.find((c) => c.table === 'identity_profiles');
    const evidence = capture.find((c) => c.table === 'identity_evidence_scores');
    expect(rollup).toBeDefined(); // resolution path still wrote the rollup
    expect(evidence).toBeDefined(); // hook fired
    // 18 (2 claims) + 12 (2 merchants) + 20 (5d) + 15 (chargeback) = 65
    expect(evidence!.payload.evidence_score).toBe(65);
    expect(evidence!.payload.evidence_level).toBe('substantial');
  });

  it('does not break resolution when the evidence recompute fails', async () => {
    const capture: Capture[] = [];
    const client = makeClient(
      {
        support_payout_cases: { list: { data: [], error: null } },
        identity_profiles: {
          upsert: { error: null },
          single: { data: null, error: { message: 'recompute read boom' } }, // forces recompute to throw
        },
        merchant_identity_state: { list: { data: [], error: null } },
      },
      capture,
    );

    // Hook swallows the failure; refreshIdentityProfile still resolves.
    await expect(refreshIdentityProfile(client, 'id-1', ctx)).resolves.toBeUndefined();

    expect(capture.find((c) => c.table === 'identity_profiles')).toBeDefined(); // rollup still written
    expect(capture.find((c) => c.table === 'identity_evidence_scores')).toBeUndefined(); // no failure-zero write
  });
});
