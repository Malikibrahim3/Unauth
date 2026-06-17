/**
 * Evidence Scoring Engine — recompute orchestration.
 *
 * Reads behavioural signals for an identity, computes the evidence score, and
 * upserts the cached row in identity_evidence_scores. Uses the service-role
 * client (the network tables are service-role only). No process.env, no `as any`.
 *
 * This module only computes + caches. Wiring it to resolver refresh and the
 * nightly cron happens in later iterations.
 *
 * Failure policy: a stale-but-real cached score is safer to act on than a falsely
 * blank one, so on ANY aggregation or upsert failure we log and return a failed
 * result WITHOUT writing — the previous cached row is left intact. We never write
 * zero/null over a real score on failure. (A genuine 0 for an identity with no
 * claims and no flag is a real computed value, not a failure, and is cached.)
 */
import { TABLES } from '@/lib/supabase/tables';
import { createServiceClient } from '@/lib/supabase/server';
import { computeEvidenceScore, type BehavioralSignals, type EvidenceScoreResult } from './score';

type ServiceClient = ReturnType<typeof createServiceClient>;

export interface RecomputeDeps {
  /** Injected for tests; defaults to a real service-role client. */
  client?: ServiceClient;
  /** Injected for deterministic tests; defaults to Date.now(). */
  nowMs?: number;
}

export type RecomputeResult =
  | { ok: true; score: EvidenceScoreResult }
  | { ok: false; error: string };

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysSince(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((nowMs - then) / MS_PER_DAY));
}

function uniqueClaimTypes(values: Array<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const v of values) {
    if (typeof v === 'string' && v.length > 0) out.add(v);
  }
  return [...out];
}

/**
 * Build the BehavioralSignals for an identity.
 *
 * - network_claim_count / network_merchant_count / claim_types ← identity_profiles
 *   (falls back to direct claims aggregation when no profile row exists).
 * - days_since_last_claim ← max(claims.submitted_at) for this identity_id
 *   (NEVER identity_profiles.last_seen_at, which tracks signal observation, not claims).
 * - is_network_flagged ← any merchant_identity_state row with on_watchlist = true.
 *
 * Throws on a hard DB error so the caller can treat it as a failure (no upsert).
 */
export async function getIdentityEvidenceSignals(
  identityId: string,
  deps: RecomputeDeps = {},
): Promise<BehavioralSignals> {
  const client: ServiceClient = deps.client ?? createServiceClient();
  const nowMs = deps.nowMs ?? Date.now();

  const { data: profile, error: profileError } = await client
    .from(TABLES.IDENTITY_PROFILES)
    .select('total_claims, merchant_count, claim_type_counts')
    .eq('identity_id', identityId)
    .maybeSingle();
  if (profileError) {
    throw new Error(`identity_profiles read failed: ${profileError.message ?? String(profileError)}`);
  }

  const { data: flagRows, error: flagError } = await client
    .from(TABLES.WATCHLIST_ENTRIES)
    .select('identity_id')
    .eq('identity_id', identityId)
    .eq('on_watchlist', true)
    .limit(1);
  if (flagError) {
    throw new Error(`merchant_identity_state read failed: ${flagError.message ?? String(flagError)}`);
  }
  const is_network_flagged = Array.isArray(flagRows) && flagRows.length > 0;

  if (profile) {
    // Recency always from claims, not the profile rollup.
    const { data: lastClaim, error: recencyError } = await client
      .from(TABLES.MERCHANT_CLAIMS)
      .select('submitted_at')
      .eq('identity_id', identityId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recencyError) {
      throw new Error(`claims recency read failed: ${recencyError.message ?? String(recencyError)}`);
    }

    const counts = (profile.claim_type_counts ?? {}) as Record<string, number>;
    return {
      network_claim_count: Number(profile.total_claims ?? 0),
      network_merchant_count: Number(profile.merchant_count ?? 0),
      days_since_last_claim: daysSince(lastClaim?.submitted_at, nowMs),
      claim_types: uniqueClaimTypes(Object.keys(counts)),
      is_network_flagged,
    };
  }

  // Fallback: no rollup row yet — aggregate directly from linked claims.
  const { data: claimRows, error: claimsError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('claim_type, merchant_id, submitted_at')
    .eq('identity_id', identityId);
  if (claimsError) {
    throw new Error(`claims aggregation read failed: ${claimsError.message ?? String(claimsError)}`);
  }
  const rows: Array<{ claim_type?: string | null; merchant_id?: string | null; submitted_at?: string | null }> =
    Array.isArray(claimRows) ? claimRows : [];

  const merchantIds = new Set<string>();
  let latest: string | null = null;
  for (const r of rows) {
    if (r.merchant_id) merchantIds.add(r.merchant_id);
    if (r.submitted_at && (latest === null || Date.parse(r.submitted_at) > Date.parse(latest))) {
      latest = r.submitted_at;
    }
  }

  return {
    network_claim_count: rows.length,
    network_merchant_count: merchantIds.size,
    days_since_last_claim: daysSince(latest, nowMs),
    claim_types: uniqueClaimTypes(rows.map((r) => r.claim_type)),
    is_network_flagged,
  };
}

/**
 * Recompute and cache the evidence score for a single identity.
 * Failure-safe: never overwrites a prior real score with a failure-zero.
 */
export async function recomputeIdentityEvidenceScore(
  identityId: string,
  deps: RecomputeDeps = {},
): Promise<RecomputeResult> {
  const client: ServiceClient = deps.client ?? createServiceClient();
  const nowMs = deps.nowMs ?? Date.now();

  let score: EvidenceScoreResult;
  try {
    const signals = await getIdentityEvidenceSignals(identityId, { client, nowMs });
    score = computeEvidenceScore(signals);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[evidence:recompute] signal aggregation failed for ${identityId}: ${message}`);
    return { ok: false, error: message };
  }

  const { error: upsertError } = await client.from(TABLES.IDENTITY_EVIDENCE_SCORES).upsert(
    {
      identity_id: identityId,
      evidence_score: score.evidence_score,
      evidence_level: score.evidence_level,
      has_sufficient_data: score.has_sufficient_data,
      score_breakdown: score.breakdown,
      scoring_config_version: score.scoring_config_version,
      computed_at: new Date(nowMs).toISOString(),
    },
    { onConflict: 'identity_id' },
  );
  if (upsertError) {
    const message = upsertError.message ?? String(upsertError);
    console.error(`[evidence:recompute] upsert failed for ${identityId}: ${message}`);
    return { ok: false, error: message };
  }

  return { ok: true, score };
}

export interface BatchRecomputeOptions {
  client?: ServiceClient;
  nowMs?: number;
  /** Max identities processed concurrently. */
  concurrency?: number;
}

export interface BatchRecomputeSummary {
  total: number;
  succeeded: number;
  failed: number;
  failures: Array<{ identityId: string; error: string }>;
}

/**
 * Recompute scores for many identities with bounded concurrency. A single
 * identity's failure never aborts the batch (cron uses this; the resolver hook
 * uses the single-identity function).
 */
export async function recomputeEvidenceScoresForIdentities(
  identityIds: string[],
  options: BatchRecomputeOptions = {},
): Promise<BatchRecomputeSummary> {
  const client: ServiceClient = options.client ?? createServiceClient();
  const nowMs = options.nowMs ?? Date.now();
  const concurrency = Math.max(1, options.concurrency ?? 8);

  const summary: BatchRecomputeSummary = {
    total: identityIds.length,
    succeeded: 0,
    failed: 0,
    failures: [],
  };

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < identityIds.length) {
      const index = cursor;
      cursor += 1;
      const identityId = identityIds[index];
      const result = await recomputeIdentityEvidenceScore(identityId, { client, nowMs });
      if (result.ok) {
        summary.succeeded += 1;
      } else {
        summary.failed += 1;
        summary.failures.push({ identityId, error: result.error });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, identityIds.length || 1) }, () => worker()));
  return summary;
}
