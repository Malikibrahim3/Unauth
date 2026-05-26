# Engine Recall Fixes — ASOS Trial Hardening

**Source:** Blind stress-test against 8 synthetic scenarios on 2026-05-25. Full results in [scripts/blind-stress/reports/](../scripts/blind-stress/reports/).

**Trial context:** ASOS is a paying merchant trialling the engine. Their CSV will not match our synthetic scenarios exactly, so every fix below must be **structural**, not data-shaped. The patterns the stress test surfaced (email rotation, cross-merchant rings, velocity bursts) are common real-world fraud patterns; they will appear in ASOS data in different proportions.

**Non-negotiable invariants** (must hold after every fix):
- Precision must not drop below the stress-test baseline of 1.000 on scenarios that flagged ≥ 1 order (S1, S2, S5, S8) once the fix is regression-tested.
- FPR must not exceed 0.05 on any scenario.
- Identity precision must not drop below 0.95.
- Zero false DEFINITE verdicts.
- `FLAG_THRESHOLD`, all entries in `SIGNAL_WEIGHTS`, all `RISK_TIER_THRESHOLDS`, all `CONFIDENCE_THRESHOLDS`, k-anonymity floor (3), and the linker's matching algorithm are **frozen**. None of these may be touched.
- The corroboration halving constant `0.45` itself is **frozen**. What changes is the *classification* of which signals count as "broad overlap" vs "strong fraud evidence" — not the multiplier.

---

## What the stress test exposed

| Failure | Scope | Root cause |
|---|---|---|
| Recall 0.04–0.27 on every scenario with a fraud ring | All 8 | Behavioural signals (`refundRate`, `refundPattern`, `paymentChurn`, `valueAnomaly`, `inrAbuse`, `velocity`) are keyed on `emailHash`. Rings that rotate emails defeat them — each rotated order looks like a first-time customer. |
| Cross-merchant signal fires 2,015× but produces almost no flags | S1, S2, S4, S5, S6, S8 | `crossMerchant` is in the **broad-overlap** list in both `computeScore` functions ([lib/engine/index.ts:70](../lib/engine/index.ts), [lib/engine/fastScore.ts:787](../lib/engine/fastScore.ts)). When it fires without a behavioural signal also firing, the score is halved by `× 0.45`. Email rotation defeats the behavioural co-firing — so cross-merchant evidence loses half its weight even when k ≥ 3 is satisfied. |
| Velocity fires 21× in S6, flags 0 orders | S6 | `velocity` is **neither** broad-overlap **nor** strong-evidence in either `computeScore`. When it fires alongside any broad-overlap signal (`addressClustering`, `crossMerchant`), the broad-overlap penalty applies and velocity cannot rescue the score. |
| k-anonymity 2-merchant ring leaked 1 flagged order | S5 | A single order in the suppressed ring picked up enough non–cross-merchant signal weight to clear FLAG_THRESHOLD. Not a k-anon gate violation, but a precision leak. Low priority — flagged for monitoring, not a Prompt-level fix. |
| `synthetic:iterate` npm script missing | All | `scripts/merchant-readiness-loop.sh:45` invokes a script that does not exist. Loop fails on first round; readiness benchmark untestable. |
| Divergence between `lib/engine/index.ts:73` and `lib/engine/fastScore.ts:790` strong-evidence lists | All | `index.ts` includes `billingAddressClusteringActive` and `networkDeviceLinkActive` in strong-evidence; `fastScore.ts` does not. **Production (`fastScore`) and eval (`index`) score differently.** Any fix below must land in **both** files. |

---

## Fix 1 — Identity-keyed history aggregation

### Problem

Six behavioural signals look up history via `context.customerOrderHistory.get(order.emailHash)`:

| Signal | File | Aggregation behaviour |
|---|---|---|
| `velocity` | [lib/engine/signals/velocity.ts:24](../lib/engine/signals/velocity.ts) | Computes burst counts in 1h/24h/7d windows over `customerOrderHistory.get(emailHash)`. |
| `refundRate` | `lib/engine/signals/refundRate.ts` | Computes refund rate over the customer's history. |
| `refundPattern` | [lib/engine/signals/refundPattern.ts:24](../lib/engine/signals/refundPattern.ts) | Computes acceleration of refund claims. |
| `paymentChurn` | `lib/engine/signals/paymentChurn.ts` | Counts distinct payment methods over the customer's history. |
| `valueAnomaly` | `lib/engine/signals/valueAnomaly.ts` | Standard-deviation distance of current order from customer's value distribution. |
| `inrAbuse` | `lib/engine/signals/inrAbuse.ts` | INR rate over the customer's history. |

When ring members each use a unique email, every order's `customerOrderHistory.get(emailHash)` returns `[currentOrder]` — length 1. `velocity` short-circuits at `customerOrders.length < 2`. `refundPattern` short-circuits at `priorRefundDates.length < 2`. Etc. The behavioural signals are silenced, leaving only address/cross-merchant evidence, which gets halved.

### Fix

After the linker produces clusters, build a **cluster-keyed history map** and rewrite `customerOrderHistory` so that two orders in the same cluster see the same merged history.

The signal code stays untouched. The map's contents change.

### Implementation

#### 1.1 — New helper: `mergeHistoryByCluster`

Location: new file `lib/engine/identityHistory.ts` (a thin pure helper alongside existing identity helpers).

```ts
import type { NormalisedOrder } from './types';
import type { LinkerResult } from '../linker';

/** Linker confidence floor for treating a cluster as a single identity for
 *  history-aggregation purposes. Set to the canonical PROBABLE threshold (65)
 *  to ensure we only merge histories for clusters the identity layer would
 *  itself surface as same-person. Imported from weights.ts to stay in sync
 *  with CONFIDENCE_THRESHOLDS; do not hardcode. */
import { CONFIDENCE_THRESHOLDS } from './weights';

export interface MergedHistory {
  /** emailHash → merged history (all orders across the linked cluster) */
  byEmailHash: Map<string, NormalisedOrder[]>;
  /** Diagnostic: which clusters contributed each emailHash's merged list */
  emailHashToClusterId: Map<string, string>;
  /** Count of emailHashes whose history was expanded by this merge */
  mergedEmailHashCount: number;
}

export function mergeHistoryByCluster(
  orders: NormalisedOrder[],
  linkerResult: LinkerResult,
  confidenceFloor: number = CONFIDENCE_THRESHOLDS.PROBABLE,
): MergedHistory {
  // Index orders by id
  const orderById = new Map<string, NormalisedOrder>();
  for (const o of orders) orderById.set(o.orderId, o);

  // orderId → clusterId for clusters >= confidenceFloor with ≥ 2 distinct emailHashes
  const orderToCluster = new Map<string, string>();
  const clusterOrders = new Map<string, NormalisedOrder[]>();
  for (const cluster of linkerResult.clusters) {
    if (cluster.confidence_score < confidenceFloor) continue;
    const clusterMemberOrders: NormalisedOrder[] = [];
    const distinctEmails = new Set<string>();
    for (const oid of cluster.order_ids) {
      const o = orderById.get(oid);
      if (!o) continue;
      clusterMemberOrders.push(o);
      distinctEmails.add(o.emailHash);
    }
    // Only merge when the cluster ACTUALLY spans multiple emailHashes.
    // Single-email clusters add no information; skipping them keeps the
    // default behaviour identical for non-rotating customers.
    if (distinctEmails.size < 2) continue;
    for (const o of clusterMemberOrders) {
      orderToCluster.set(o.orderId, cluster.cluster_id);
    }
    clusterOrders.set(cluster.cluster_id, clusterMemberOrders);
  }

  // Build per-emailHash merged history. Every order in a merged cluster
  // contributes its emailHash → the cluster's full order list.
  const byEmailHash = new Map<string, NormalisedOrder[]>();
  const emailHashToClusterId = new Map<string, string>();
  // Start with the per-email default (legacy behaviour for unmerged orders)
  for (const o of orders) {
    const cid = orderToCluster.get(o.orderId);
    if (!cid) {
      const arr = byEmailHash.get(o.emailHash) ?? [];
      arr.push(o);
      byEmailHash.set(o.emailHash, arr);
    }
  }
  // Override with cluster-merged history for orders in multi-email clusters.
  // A given emailHash can appear in at most one cluster (since identity-link
  // is transitive within the cluster), so this is safe.
  let mergedEmailHashCount = 0;
  for (const [cid, members] of clusterOrders) {
    const distinctEmails = new Set(members.map((m) => m.emailHash));
    for (const eh of distinctEmails) {
      byEmailHash.set(eh, members);
      emailHashToClusterId.set(eh, cid);
      mergedEmailHashCount++;
    }
  }
  return { byEmailHash, emailHashToClusterId, mergedEmailHashCount };
}
```

Key design choices, called out so the implementing engineer knows why:

- **Confidence floor of `CONFIDENCE_THRESHOLDS.PROBABLE` (65)**. Setting it lower (e.g. `POSSIBLE = 45`) would merge histories for weak matches and risk merging legitimate roommates / family. Setting it higher (`DEFINITE = 85`) would miss most rotated-email rings. PROBABLE is the same bar the identity layer uses to surface clusters in the merchant UI; using the same threshold keeps "the engine flags it" and "the merchant UI says probable" in lockstep.
- **`distinctEmails.size < 2` skip**. Single-email clusters (the common case — a real customer who happens to share an IP with a different customer) add nothing. Skipping them keeps the default behaviour identical for all non-rotation cases, which protects precision on ASOS's legitimate-customer majority.
- **Map override, not append**. A merged emailHash's entry is replaced with the full cluster history, not appended. This is deliberate: the cluster history already contains every order from every emailHash in the cluster.
- **No mutation of orders**. We don't add a `clusterId` field to `NormalisedOrder`. The signals don't need to know they're operating on merged history.

#### 1.2 — Wire into eval path: `lib/engine/index.ts`

Add an optional `linkerResult` to `ScoreOrdersOptions`. When present, replace the per-email `customerOrderHistory` with the merged map.

```ts
// In ScoreOrdersOptions:
linkerResult?: LinkerResult;
historyMergeConfidenceFloor?: number;  // defaults to CONFIDENCE_THRESHOLDS.PROBABLE

// In buildContext:
function buildContext(orders: NormalisedOrder[], opts?: ScoreOrdersOptions): ScoringContext {
  let customerOrderHistory: Map<string, NormalisedOrder[]>;
  if (opts?.linkerResult) {
    const merged = mergeHistoryByCluster(
      orders,
      opts.linkerResult,
      opts.historyMergeConfidenceFloor ?? CONFIDENCE_THRESHOLDS.PROBABLE,
    );
    customerOrderHistory = merged.byEmailHash;
  } else {
    customerOrderHistory = new Map<string, NormalisedOrder[]>();
    for (const order of orders) {
      const arr = customerOrderHistory.get(order.emailHash) ?? [];
      arr.push(order);
      customerOrderHistory.set(order.emailHash, arr);
    }
  }
  return { allOrders: orders, customerOrderHistory, /* ...rest unchanged */ };
}
```

Backwards compat: when `linkerResult` is omitted, behaviour is byte-for-byte identical to today.

#### 1.3 — Wire into production path: `lib/processing/worker.ts`

The production path runs the linker before `buildFastContext`. Look at worker.ts:587–611 — the cluster map is already built. We pass `linkerResult` into `buildFastContext` and have it apply the merge.

In `lib/engine/fastContext.ts`, change the signature:

```ts
export async function buildFastContext(
  orders: NormalisedOrder[],
  supabase: SupabaseClient,
  merchantId?: string,
  linkerResult?: LinkerResult,            // NEW
  historyMergeConfidenceFloor?: number,   // NEW, defaults to PROBABLE
): Promise<FastScoringContext>
```

Inside `buildFastContext`, replace the lines 285–289 loop with:

```ts
if (linkerResult) {
  const merged = mergeHistoryByCluster(
    orders,
    linkerResult,
    historyMergeConfidenceFloor ?? CONFIDENCE_THRESHOLDS.PROBABLE,
  );
  for (const [eh, hist] of merged.byEmailHash) customerOrderHistory.set(eh, hist);
} else {
  for (const order of orders) {
    const arr = customerOrderHistory.get(order.emailHash) ?? [];
    arr.push(order);
    customerOrderHistory.set(order.emailHash, arr);
  }
}
```

And in `worker.ts` around line 588, pass `linkerResult` in (note that the linker runs in parallel with buildFastContext today; pass after it completes — see "Sequencing" below):

```ts
// Before
const contextPromise = buildFastContext(normOrders, serviceClient, merchantId);
// linker runs in parallel...
const linkerResult = linkIdentities(linkerInputs);
const context = await contextPromise;

// After (linker first, then context)
const linkerResult = linkIdentities(linkerInputs);
const context = await buildFastContext(normOrders, serviceClient, merchantId, linkerResult);
```

**Caveat the implementer must handle:** the original parallel structure was deliberate — the existing comment at worker.ts:582–586 says it shaves ~15–60 s by overlapping Supabase I/O with linker CPU. Running them sequentially regresses that. To preserve the parallelism, build the merged history *after* both complete and patch `customerOrderHistory` in place:

```ts
const contextPromise = buildFastContext(normOrders, serviceClient, merchantId);
const linkerResult = linkIdentities(linkerInputs);
const context = await contextPromise;
// patch customerOrderHistory using linker output
const merged = mergeHistoryByCluster(normOrders, linkerResult, CONFIDENCE_THRESHOLDS.PROBABLE);
for (const [eh, hist] of merged.byEmailHash) context.customerOrderHistory.set(eh, hist);
```

This keeps the I/O–CPU overlap, lands the merge before `scoreBatch`, and is the lowest-risk wiring. **Prefer this form.**

#### 1.4 — Wire into the stress-test harness

[scripts/blind-stress/run.ts](../scripts/blind-stress/run.ts) calls `scoreOrders` directly without `linkerResult`. After this fix, that harness will report stale numbers. Update it to pass `linkerResult` so the regression tests measure the new behaviour. (Sequence: do this *after* fixes 1.1–1.3 land, otherwise the harness will crash on the unknown option.)

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| Linker over-clusters legitimate customers (roommates, families, shared IP at the office), so their histories merge and they get flagged. | PROBABLE confidence floor (65). The linker uses 65 as the same bar that surfaces clusters in the merchant UI today — if a cluster is below 65 we don't merge. Audit the false-positive list after deploying. |
| `mergedEmailHashCount` could grow unbounded for one super-cluster, blowing up signal compute. | The linker already caps cluster size during link expansion (see `expansion_run` checkpoint). Verify by logging `mergedEmailHashCount` and the max cluster size; alert if any single cluster exceeds 1,000 orders. |
| Production race: linker not finished when fastScore needs context. | Use the "patch after both complete" wiring in 1.3. Add a unit test asserting `customerOrderHistory` is replaced *before* `scoreBatch` is called. |
| The `velocity` signal counts the current order. With merged history, an order can find itself "already in the bucket" — but it always did under per-email aggregation too, so behaviour is unchanged. | None needed; verify with the unit test below. |

### Regression tests

1. **No-rotation cluster behaviour unchanged.** Build 100 orders, 50 distinct emails, no rotation, no shared identifiers. Run with and without `linkerResult`. Assert: identical `ScoredOrder[]` output. Goal: catch any accidental behaviour change for the legitimate-customer majority.
2. **Rotated-email cluster expansion.** Build 5 orders with 5 different emails but identical card+address+device. Run linker — expect 1 cluster of 5. Run scoring with merged history. Assert: `customerOrderHistory.get(orders[0].emailHash)` returns a length-5 array.
3. **Confidence floor honoured.** Build 5 orders linked only by IP overlap (linker confidence well below 65). Assert: no merge.
4. **Velocity now fires on rotated rings.** Build 6 orders, same identity, distinct emails, within 24h. Without merge: velocity does not fire (history length 1 per email). With merge: velocity fires with score ≥ 75 (5-in-24h threshold). Asserts the user-facing behaviour change.
5. **Precision floor.** Re-run all 8 stress scenarios with merge enabled. Assert precision remains ≥ baseline (1.000 on S1/S2/S5/S8) and FPR ≤ 0.05 on every scenario.

---

## Fix 2 — Reclassify `crossMerchant` as strong evidence when it fires

### Problem

The wrapper at [lib/engine/signals/crossMerchantSignal.ts:48–62](../lib/engine/signals/crossMerchantSignal.ts) already gates the signal hard: it only fires when `networkOrders ≥ 3 OR inrRate ≥ 0.20`. So **every time `crossMerchant` actually fires, the underlying evidence already crosses behavioural-meaningful thresholds**: it represents another merchant's same-identity orders, at least 3 of them or a 20%+ refund rate.

Despite that, `crossMerchant` is classified as **broad overlap**, not **strong evidence**, in both `computeScore` functions ([lib/engine/index.ts:70](../lib/engine/index.ts), [lib/engine/fastScore.ts:787](../lib/engine/fastScore.ts)). The result: when crossMerchant fires alongside `addressClustering` (the most common companion in the stress test), `hasBroadOverlap=true, hasStrongFraudEvidence=false`, score halved.

The wrapper's existing quality gate already ensures crossMerchant is meaningful when it fires. The classification is wrong.

### Fix

Move `crossMerchant` from the broad-overlap list to the strong-evidence list, in **both** files. The wrapper's quality gate (3+ network orders OR 20%+ refund rate) IS the behavioural floor.

### Implementation

#### 2.1 — `lib/engine/index.ts:70–75`

Current:
```ts
if (['addressClustering', 'billingAddressClustering', 'emailPattern', 'crossMerchant', 'addressMismatch', 'networkDeviceLink'].includes(signal.name)) {
  hasBroadOverlap = true;
}
if (['refundRate', 'inrAbuse', 'inrSpeed', 'paymentChurn', 'refundPattern', 'disputeHistory', 'valueAnomaly', 'billingAddressClusteringActive', 'networkDeviceLinkActive'].includes(signal.name)) {
  hasStrongFraudEvidence = true;
}
```

Change to:
```ts
const BROAD_OVERLAP = new Set(['addressClustering', 'billingAddressClustering', 'emailPattern', 'addressMismatch', 'networkDeviceLink']);
const STRONG_FRAUD_EVIDENCE = new Set(['refundRate', 'inrAbuse', 'inrSpeed', 'paymentChurn', 'refundPattern', 'disputeHistory', 'valueAnomaly', 'billingAddressClusteringActive', 'networkDeviceLinkActive', 'crossMerchant']);

if (BROAD_OVERLAP.has(signal.name)) hasBroadOverlap = true;
if (STRONG_FRAUD_EVIDENCE.has(signal.name)) hasStrongFraudEvidence = true;
```

(`Set` lookup is also a micro-cleanup — current code rebuilds the arrays on every iteration.)

#### 2.2 — `lib/engine/fastScore.ts:787–791`

Same change — `crossMerchant` moves from broad-overlap to strong-evidence.

**Critical:** the two lists in `index.ts` and `fastScore.ts` are currently **divergent** — `index.ts` includes `billingAddressClusteringActive` and `networkDeviceLinkActive` in strong-evidence while `fastScore.ts` does not. This means production and eval already score differently, which is a latent bug. Use this fix as the opportunity to extract both lists into a shared constant.

Proposed location: `lib/engine/weights.ts` (since it already houses all scoring constants — keeps single source of truth):

```ts
export const BROAD_OVERLAP_SIGNALS = new Set([
  'addressClustering',
  'billingAddressClustering',
  'emailPattern',
  'addressMismatch',
  'networkDeviceLink',
]);

export const STRONG_FRAUD_EVIDENCE_SIGNALS = new Set([
  'refundRate',
  'inrAbuse',
  'inrSpeed',
  'paymentChurn',
  'refundPattern',
  'disputeHistory',
  'valueAnomaly',
  'billingAddressClusteringActive',
  'networkDeviceLinkActive',
  'crossMerchant',
]);
```

Both `index.ts` and `fastScore.ts` import from this single source. Add a unit test asserting the two sets are disjoint (a signal cannot be both — that would deadlock the halving rule).

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| Crossmerchant alone could now push a clean address-only match to flag — e.g. a roommate-style legitimate co-occurrence at 3 merchants. | The wrapper's quality gate (`networkOrders < 3 && inrRate < 0.20`) already rejects this. A 0-refund 1-order match at 3 merchants does *not* fire crossMerchant under the wrapper. Verify by replaying the stress-test S4 (high-noise low-fraud) where legitimate customers share postcodes — no false positives are expected. |
| Production has k-anon ≥ 3 enforced in the database query (`crossMerchant.ts:11`), but in eval mode the harness synthesises profiles. If the harness lowers the k-anon gate, this reclassification could leak false positives in eval but not in production. | The stress-test harness already enforces `merchantsSeen.size < 3` skip ([scripts/blind-stress/run.ts](../scripts/blind-stress/run.ts) builder). Document this; do not loosen for any reason. |
| The k-anon 2-merchant ring leak in S5 (1 order flagged when 0 expected) could become worse after the reclassification. | Run S5 specifically and inspect: the leak today is *not* via crossMerchant (the suppressed ring's profile is filtered out at `merchantsSeen.size < 3`). The leak is via addressClustering + networkDeviceLink on a non-suppressed signal path. Fix 2 doesn't affect it, but verify. |

### Regression tests

1. **Lists are disjoint.** Unit test asserting `BROAD_OVERLAP_SIGNALS` and `STRONG_FRAUD_EVIDENCE_SIGNALS` share no elements.
2. **Production and eval score identically.** For a fixed input order with all signals fired at known scores, assert `scoreOrders` and `scoreBatch` produce the same `totalScore` (within float epsilon). The current divergence is a real bug; the fix should eliminate it.
3. **CrossMerchant + addressClustering co-firing.** Build an order with only those two signals firing. Before fix: score ≈ rawScore × 0.45. After fix: score ≈ rawScore. Assert.
4. **CrossMerchant alone.** Build an order with only crossMerchant firing. Before fix: rawScore (no halving since no broad-overlap). After fix: rawScore (no halving since no broad-overlap). Assert no change. (This catches accidental side effects.)
5. **S5 stress-test rerun.** k=3 and k=6 rings must surface at PROBABLE+. k=2 ring must remain suppressed.

---

## Fix 3 — Velocity bypass for behavioural co-firing

### Problem

`velocity` is **not** in either list:

```ts
// lib/engine/index.ts:70-75 — neither broad-overlap nor strong-evidence
// lib/engine/fastScore.ts:787-791 — neither
```

When `velocity` fires alone, no halving (no broad-overlap fires). Score 90 × 18 / 18 = 90 → flagged. Fine.

When `velocity` fires alongside `addressClustering` or `crossMerchant` (the common ring pattern: bursts at a shared address, identifiable cross-merchant), the broad-overlap rule kicks in and halves the score. Velocity contributes weight 18 but cannot itself rescue it.

In S6 (3 customers placing 6–10 orders in 24–72h followed by refunds), 21 velocity fires produced 0 flags because velocity fired alongside `crossMerchant` (16 fires) and `disputeHistory` (2 fires). The 16 cross-merchant fires were the issue (broad-overlap, no behavioural co-firing) — which Fix 2 resolves. But velocity should not be silently dropped from the strong-evidence picture either.

### Fix

Add `velocity` to `STRONG_FRAUD_EVIDENCE_SIGNALS` **with a score floor** — only count it as strong evidence when its score ≥ 70.

Why a floor? The velocity signal's thresholds emit:
- score 35 = 8 orders / 7 days (could be a normal heavy buyer)
- score 50 = 3 orders / 24h
- score 55 = 15 orders / 7 days
- score 70 = 2 orders / 1h
- score 75 = 5 orders / 24h
- score 90 = 3 orders / 1h

Scores 35 and 55 are "sustained but plausibly legitimate". Scores ≥ 70 are "burst-level anomalous". Treating the high-score tier as strong evidence catches rings without letting weekend power-shoppers slip through.

### Implementation

#### 3.1 — Add evidence-floor support to `computeScore` in both files

Today the strong-evidence check is a name-set lookup. Add a tier-2 check that also inspects the signal's `score`:

```ts
const STRONG_FRAUD_EVIDENCE_SIGNALS = new Set([
  'refundRate', 'inrAbuse', 'inrSpeed', 'paymentChurn', 'refundPattern',
  'disputeHistory', 'valueAnomaly', 'billingAddressClusteringActive',
  'networkDeviceLinkActive', 'crossMerchant',
]);

// Signals whose contribution counts as strong evidence ONLY when the per-signal
// score crosses a floor. velocity at score < 70 = sustained but plausibly
// legitimate; >= 70 = burst-level anomaly.
const STRONG_EVIDENCE_BY_SCORE: Record<string, number> = {
  velocity: 70,
};

// Inside the loop:
if (STRONG_FRAUD_EVIDENCE_SIGNALS.has(signal.name)) hasStrongFraudEvidence = true;
const floor = STRONG_EVIDENCE_BY_SCORE[signal.name];
if (floor !== undefined && signal.score >= floor) hasStrongFraudEvidence = true;
```

Land this in both `lib/engine/index.ts` and `lib/engine/fastScore.ts`. The `STRONG_EVIDENCE_BY_SCORE` constant should live in `lib/engine/weights.ts` alongside the sets — same SSOT.

#### 3.2 — Why **not** Sonnet's proposed `velocity + refund_requested + interval ≤ 3 days` conjunction

Sonnet's prompt proposed a per-order conjunction: only exempt halving when velocity AND `refund_requested=true` AND refund interval ≤ 3 days. The problem with that approach:

1. It requires `computeScore` to see the order, not just the signals. That's a larger refactor across both eval and production code paths.
2. The "refund interval ≤ 3 days" check is already what `refundPattern` exists to test. If `refundPattern` fires, it's already in strong-evidence and the bypass triggers — no velocity carveout needed.
3. The actual silenced case the stress test surfaced is velocity + cross-merchant *without* refund_requested on the specific row being scored (because email rotation puts the refund_requested on a *different* row of the same ring). The conjunction Sonnet proposed would not help here.

Score-floor on velocity alone is cleaner, more general, and catches the patterns the stress test surfaced. ASOS data may or may not have the same refund interval pattern — relying on the velocity signal's own thresholds keeps the fix data-shape-agnostic.

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| A burst-buying legitimate customer (e.g. someone ordering 6 items for a wedding) fires velocity ≥ 70 alongside addressClustering (multiple items shipping to the same place). Flagged. | Their `customerOrderHistory` doesn't show refunds or chargebacks — so `refundRate`, `disputeHistory`, etc. all stay silent. Total score will be velocity × 18 / (18 + addressClustering_weight) plus a small addressClustering bump. With Fix 2 already reclassifying crossMerchant, this scenario doesn't add crossMerchant pressure. Run S4 (high-noise low-fraud) post-fix and inspect FP list. |
| Score ≥ 70 is itself a noisy threshold for legitimate Black Friday bursts. | Black Friday triggers across many independent customers, not 3-orders-in-1h or 5-orders-in-24h *per* identity. Velocity bins are per-customer; the threshold isn't merchant-wide. |
| `paymentChurn` at 24h/7d (weight 15) already exists for this pattern. Adding velocity as strong evidence is partial duplication. | Documented overlap; not a problem. Each signal can fire independently and the weighted average handles double-counting. |

### Regression tests

1. **Velocity alone at score 90.** Already flagged today. Assert: still flagged. (Catches accidental break.)
2. **Velocity at 35 + addressClustering.** Today: halved. After fix: still halved (35 < 70 floor). Assert.
3. **Velocity at 75 + addressClustering.** Today: halved. After fix: not halved. Assert score increase ≥ baseline × (1/0.45 - 1) ≈ 1.22x.
4. **S6 stress-test rerun.** All 3 burst-customer rings must surface at PROBABLE+.
5. **S4 stress-test rerun.** No legitimate customer should newly become a false positive.

---

## Fix 4 — Repair the merchant readiness loop

### Problem

[scripts/merchant-readiness-loop.sh:45](../scripts/merchant-readiness-loop.sh) runs `npm run synthetic:iterate`. No such script in `package.json`. The loop fails on its first iteration.

`synthetic-lab/iterate.ts` exists at the file level (I verified during the stress test). So the npm wrapper just needs to be added.

### Fix

Add to `package.json` scripts block:

```json
"synthetic:iterate": "ts-node --transpile-only --compiler-options '{\"module\":\"commonjs\",\"moduleResolution\":\"node\"}' synthetic-lab/iterate.ts",
```

Match the form used by sibling scripts like `eval` and `tune:run` for consistency. **Verify `synthetic-lab/iterate.ts` accepts the CLI flags that `merchant-readiness-loop.sh:45-56` passes** (`--orders`, `--customers`, `--iterations`, `--tiers`, `--threshold`, `--seed`, `--compact`, `--max-fpr`, `--output-dir`, `--weights`, `--calibrate-threshold`). If any flag is unsupported, that is a second fix to land — don't add the script entry until the flag contract matches.

### Regression test

Run one round manually:
```bash
ORDERS=2000 CUSTOMERS=500 ITERATIONS=1 SEEDS=42 CONSECUTIVE_REQUIRED=1 ./scripts/merchant-readiness-loop.sh
```
Should produce a `synthetic-lab/outputs/auto-round-1-seed-42/iterate-summary.json` and either pass or report a clean failure with the four metrics.

---

## Sequencing

The fixes have dependencies; do them in this order.

1. **Fix 4 first.** Trivial, zero risk, unblocks the readiness loop so we can use it as a regression check for Fixes 1–3.
2. **Fix 2.** Smallest change, easiest to roll back, surfaces the index.ts / fastScore.ts divergence which Fix 1 will compound if not addressed first.
3. **Fix 1.** Largest change, highest leverage. Land *after* the shared SSOT constants from Fix 2 are in place so the merge logic can reuse them.
4. **Fix 3.** Smallest change after Fix 2; trivially layered on top of the new SSOT.
5. **Re-run the blind stress test.** All 8 scenarios + the 5k buildFastContext benchmark + one round of the readiness loop. Compare metrics vs the pre-fix baseline in [scripts/blind-stress/reports/](../scripts/blind-stress/reports/).
6. **Run against the ASOS sample (if available).** Compare flagged orders vs human-labelled ground truth from their pilot dataset before any of these changes ship to their tenant.

---

## What this doc deliberately leaves out

- **Identity recall failure on S2/S3 (missing phone+card).** The linker simply doesn't have enough information to merge those orders. This is a data-completeness floor, not an engine bug. Fixing it would require either (a) lowering linker thresholds — explicitly out of scope ("do not touch the linker") or (b) a new identifier we don't have. Document, don't fix.
- **k-anon 2-merchant ring leak (1 order flagged in S5).** Real but not the leverage point. Address only if it persists after Fixes 1–3 land; investigate then via per-signal attribution on that order.
- **Latency.** Every scenario completed in under 13 s on the in-memory path. No optimisation needed. The full ingestion-pipeline timing was not measured in the stress test and is not a recall fix.

---

## What good looks like after these fixes land

Re-run the blind stress test. The acceptance bar:

| Scenario | Today | Target after fixes |
|---|---|---|
| S1 — clean high-signal, 3 rings | precision 1.000, recall 0.059 | precision ≥ 0.85, recall ≥ 0.60, FPR ≤ 0.05 |
| S2 — missing fields | 1.000 / 0.274 | precision ≥ 0.80, recall ≥ 0.50 (degraded gracefully — phone+card missing limits ceiling) |
| S3 — minimal data | 0.000 / 0.000 | precision ≥ 0.50, recall ≥ 0.30, no crash (per the original brief: "engine does not crash or return empty results") |
| S4 — high noise low fraud | 0.000 / 0.000 | recall ≥ 0.60 on the 1 ring, FPR ≤ 0.05, review rate ≤ 6% |
| S5 — cross-merchant | 1.000 / 0.043 | recall ≥ 0.70 on k≥3 rings, k=2 ring fully suppressed, cross-merchant match rate ≥ 70% |
| S6 — velocity | 0.000 / 0.000 | recall ≥ 0.80 on the 3 burst customers (precision ≥ 0.85) |
| S7 — duplicates & malformed | unchanged (no fraud to detect; this scenario is for ingestion robustness only) | 200 valid persisted, 50 dups deduplicated, 30 malformed reported |
| S8 — 10k scale | 1.000 / 0.110 | recall ≥ 0.55, latency ≤ 30 s in-memory path |

If any scenario regresses on **precision** or **FPR** against today's baseline, halt and investigate before merging.
