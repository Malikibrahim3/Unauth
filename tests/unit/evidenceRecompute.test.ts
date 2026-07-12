import {
  getIdentityEvidenceSignals,
  recomputeIdentityEvidenceScore,
  recomputeEvidenceScoresForIdentities,
} from '@/lib/engine/evidence/recompute';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NOW = Date.UTC(2026, 5, 17); // 2026-06-17T00:00:00Z
const iso = (ms: number) => new Date(ms).toISOString();
const daysAgo = (n: number) => iso(NOW - n * MS_PER_DAY);

type Resp = { data?: unknown; error?: unknown };
interface TableConfig {
  single?: Resp;
  list?: Resp;
  upsert?: Resp;
}

interface UpsertCapture {
  table: string;
  payload: Record<string, unknown>;
  opts?: unknown;
}

// Minimal chainable Supabase-shaped fake. select/eq/order/limit return the
// builder; maybeSingle() resolves the configured single row; awaiting the
// builder resolves the configured list; upsert() records its payload.
function makeClient(config: Record<string, TableConfig>, capture: UpsertCapture[]) {
  const client = {
    from(table: string) {
      const cfg = config[table] ?? {};
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve(cfg.single ?? { data: null, error: null }),
        upsert: (payload: Record<string, unknown>, opts?: unknown) => {
          capture.push({ table, payload, opts });
          return Promise.resolve(cfg.upsert ?? { error: null });
        },
        then: (resolve: (v: Resp) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(cfg.list ?? { data: [], error: null }).then(resolve, reject),
      };
      return builder;
    },
  };
  return client;
}

// Sensible defaults; tests override per table.
const withDefaults = (cfg: Record<string, TableConfig>): Record<string, TableConfig> => ({
  merchant_identity_state: { list: { data: [], error: null } },
  ...cfg,
});

describe('getIdentityEvidenceSignals', () => {
  it('builds signals from identity_profiles + claims max date + watchlist', async () => {
    const client = makeClient(
      withDefaults({
        identity_profiles: {
          single: { data: { total_claims: 3, merchant_count: 2, claim_type_counts: { chargeback: 1, damaged: 2 } }, error: null },
        },
        support_payout_cases: { single: { data: { submitted_at: daysAgo(10) }, error: null } },
        merchant_identity_state: { list: { data: [{ identity_id: 'x' }], error: null } },
      }),
      [],
    );
    const signals = await getIdentityEvidenceSignals('id-1', { client, nowMs: NOW });
    expect(signals.network_claim_count).toBe(3);
    expect(signals.network_merchant_count).toBe(2);
    expect(signals.days_since_last_claim).toBe(10);
    expect(signals.claim_types.sort()).toEqual(['chargeback', 'damaged']);
    expect(signals.is_network_flagged).toBe(true);
  });

  it('derives recency from claims.submitted_at, never identity_profiles.last_seen_at', async () => {
    const client = makeClient(
      withDefaults({
        // last_seen_at is intentionally "today"; it must be ignored.
        identity_profiles: { single: { data: { total_claims: 1, merchant_count: 1, claim_type_counts: {}, last_seen_at: iso(NOW) }, error: null } },
        support_payout_cases: { single: { data: { submitted_at: daysAgo(40) }, error: null } },
      }),
      [],
    );
    const signals = await getIdentityEvidenceSignals('id-1', { client, nowMs: NOW });
    expect(signals.days_since_last_claim).toBe(40);
  });

  it('falls back to direct claims aggregation when no profile row exists', async () => {
    const client = makeClient(
      withDefaults({
        identity_profiles: { single: { data: null, error: null } },
        support_payout_cases: {
          list: {
            data: [
              { claim_type: 'chargeback', merchant_id: 'm1', submitted_at: daysAgo(3) },
              { claim_type: 'refund_request', merchant_id: 'm2', submitted_at: daysAgo(1) },
            ],
            error: null,
          },
        },
      }),
      [],
    );
    const signals = await getIdentityEvidenceSignals('id-1', { client, nowMs: NOW });
    expect(signals.network_claim_count).toBe(2);
    expect(signals.network_merchant_count).toBe(2);
    expect(signals.claim_types.sort()).toEqual(['chargeback', 'refund_request']);
    expect(signals.days_since_last_claim).toBe(1);
    expect(signals.is_network_flagged).toBe(false);
  });

  it('does not crash on unknown/empty claim type keys', async () => {
    const client = makeClient(
      withDefaults({
        identity_profiles: { single: { data: { total_claims: 2, merchant_count: 1, claim_type_counts: { weird_value: 1, '': 5, chargeback: 1 } }, error: null } },
        support_payout_cases: { single: { data: { submitted_at: daysAgo(2) }, error: null } },
      }),
      [],
    );
    const signals = await getIdentityEvidenceSignals('id-1', { client, nowMs: NOW });
    expect(signals.claim_types.sort()).toEqual(['chargeback', 'weird_value']); // empty string filtered out
  });

  it('throws on a hard DB error (so the caller treats it as a failure)', async () => {
    const client = makeClient(
      withDefaults({
        identity_profiles: { single: { data: null, error: { message: 'db down' } } },
      }),
      [],
    );
    await expect(getIdentityEvidenceSignals('id-1', { client, nowMs: NOW })).rejects.toThrow(/db down/);
  });
});

describe('recomputeIdentityEvidenceScore', () => {
  const fullConfig = () =>
    withDefaults({
      identity_profiles: { single: { data: { total_claims: 3, merchant_count: 2, claim_type_counts: { chargeback: 1, damaged: 2 } }, error: null } },
      support_payout_cases: { single: { data: { submitted_at: daysAgo(10) }, error: null } },
      merchant_identity_state: { list: { data: [{ identity_id: 'x' }], error: null } },
    });

  it('upserts the expected cached row on success', async () => {
    const capture: UpsertCapture[] = [];
    const client = makeClient(fullConfig(), capture);
    const result = await recomputeIdentityEvidenceScore('id-1', { client, nowMs: NOW });

    expect(result.ok).toBe(true);
    expect(capture).toHaveLength(1);
    expect(capture[0].table).toBe('identity_evidence_scores');
    const p = capture[0].payload;
    // 27 (3 claims) + 12 (2 merchants) + 16 (10d) + 15 (chargeback) + 5 (flag) = 75
    expect(p.identity_id).toBe('id-1');
    expect(p.evidence_score).toBe(75);
    expect(p.evidence_level).toBe('extensive');
    expect(p.has_sufficient_data).toBe(true);
    expect(p.scoring_config_version).toBe('v1.0');
    expect(Array.isArray(p.score_breakdown)).toBe(true);
    expect((p.score_breakdown as unknown[]).length).toBe(5);
    expect(p.computed_at).toBe(iso(NOW));
    expect(capture[0].opts).toEqual({ onConflict: 'identity_id' });
  });

  it('returns failure and does NOT write a second time when upsert fails', async () => {
    const capture: UpsertCapture[] = [];
    const config = fullConfig();
    config.identity_evidence_scores = { upsert: { error: { message: 'upsert boom' } } };
    const client = makeClient(config, capture);
    const result = await recomputeIdentityEvidenceScore('id-1', { client, nowMs: NOW });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/upsert boom/);
    expect(capture).toHaveLength(1); // the one attempted write only; no destructive retry
  });

  it('returns failure and never upserts when aggregation fails', async () => {
    const capture: UpsertCapture[] = [];
    const client = makeClient(
      withDefaults({ identity_profiles: { single: { data: null, error: { message: 'agg down' } } } }),
      capture,
    );
    const result = await recomputeIdentityEvidenceScore('id-1', { client, nowMs: NOW });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/agg down/);
    expect(capture).toHaveLength(0); // no zero-score written over a prior real row
  });

  it('caches a real zero-evidence row (0 claims, no flag) — that is not a failure', async () => {
    const capture: UpsertCapture[] = [];
    const client = makeClient(
      withDefaults({
        identity_profiles: { single: { data: { total_claims: 0, merchant_count: 0, claim_type_counts: {} }, error: null } },
        support_payout_cases: { single: { data: null, error: null } },
      }),
      capture,
    );
    const result = await recomputeIdentityEvidenceScore('id-1', { client, nowMs: NOW });
    expect(result.ok).toBe(true);
    expect(capture).toHaveLength(1);
    expect(capture[0].payload.evidence_score).toBe(0);
    expect(capture[0].payload.has_sufficient_data).toBe(false);
    expect(capture[0].payload.evidence_level).toBe('minimal');
  });

  it('breakdown contains no risk/fraud wording', async () => {
    const capture: UpsertCapture[] = [];
    const client = makeClient(fullConfig(), capture);
    await recomputeIdentityEvidenceScore('id-1', { client, nowMs: NOW });
    expect(JSON.stringify(capture[0].payload.score_breakdown)).not.toMatch(/risk|fraud/i);
  });
});

describe('recomputeEvidenceScoresForIdentities', () => {
  it('processes all ids and summarises successes/failures without aborting on one failure', async () => {
    const capture: UpsertCapture[] = [];
    const client = makeClient(
      withDefaults({
        identity_profiles: { single: { data: { total_claims: 1, merchant_count: 1, claim_type_counts: {} }, error: null } },
        support_payout_cases: { single: { data: { submitted_at: daysAgo(5) }, error: null } },
      }),
      capture,
    );
    const summary = await recomputeEvidenceScoresForIdentities(['a', 'b', 'c'], { client, nowMs: NOW, concurrency: 2 });
    expect(summary.total).toBe(3);
    expect(summary.succeeded).toBe(3);
    expect(summary.failed).toBe(0);
    expect(capture).toHaveLength(3);
  });
});
