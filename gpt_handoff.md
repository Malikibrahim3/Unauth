# GPT Handoff — Identity Engine Tuning System

> **Purpose:** Everything a fresh GPT instance needs to understand, reproduce, debug, and fix the identity-resolution engine and its autonomous tuning harness. No prior context required.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Tuning Run Results](#3-tuning-run-results)
4. [Root Cause Diagnosis](#4-root-cause-diagnosis)
5. [Recommended Fixes](#5-recommended-fixes)
6. [Source: `lib/linker.ts`](#6-source-liblinkersts) *(production linker)*
7. [Source: `lib/scorer.ts`](#7-source-libscorersts) *(production scorer)*
8. [Source: `lib/confidence.ts`](#8-source-libconfidencets)
9. [Source: `scripts/tune/types.ts`](#9-source-scriptstunetypests)
10. [Source: `scripts/tune/config.ts`](#10-source-scriptstuneconfigts)
11. [Source: `scripts/tune/localLinker.ts`](#11-source-scriptstunelocallinkerts)
12. [Source: `scripts/tune/localPipeline.ts`](#12-source-scriptstunelocalpipelinets)
13. [Source: `scripts/tune/measureAccuracy.ts`](#13-source-scriptstunemeasureaccuracyts)
14. [Source: `scripts/tune/tuningLoop.ts`](#14-source-scriptstunetuningloopsts)
15. [Source: `scripts/tune/run.ts`](#15-source-scriptstuneruntss)
16. [Source: `scripts/tune/generateDatasets.ts` (excerpt)](#16-source-scriptstunegeneratedatasetsts-excerpt)
17. [Full Tuning Log](#17-full-tuning-log)
18. [Report JSON Summary](#18-report-json-summary)
19. [How to Re-Run the Tuning System](#19-how-to-re-run)

---

## 1. Executive Summary

### What the engine does
The identity-resolution engine clusters e-commerce orders into customer profiles by matching on signals like email, phone, device fingerprint, card, shipping address, name, IP and postcode. It is used for **friendly-fraud detection** — identifying repeat abusers who place orders under slightly different identities.

### Current state (after autonomous tuning run)
| Metric | Train (10k+30k) | Validation (75k) |
|--------|-----------------|-----------------|
| **F1** | **56.48%** | **28.93%** |
| Precision | 40.67% → best 41.4% | 17.18% |
| Recall | 90.05% | 91.54% |
| TP | ~504k | ~96k/dataset |
| FP | ~736k | ~460k/dataset |
| FN | ~56k | ~9k/dataset |

**Target: F1 ≥ 97%.**

The tuning run plateau'd after 9 iterations. Only 1 change was accepted (LINK_THRESHOLD 30→32, +0.45% F1). The loop was **broken** — it tested the same rejected change 8 consecutive times rather than exploring signal weights or other parameters.

The 75k validation result (F1=28.93%) reveals a **catastrophic generalisation gap**: at 75k orders, the linker generates ~460k false-positive pairs per dataset (vs ~7k at 10k scale). This is a fundamental algorithmic problem, not a threshold calibration problem.

### Priority problems (ordered)
1. **FP explosion at scale** — address/name indexes generate O(n²) FP pairs; the `addPairsFromIdx` call for `shipping_full` and `billing_full` is capped at max=200 but that still means 200×200÷2=19,900 pairs per common address. At 75k, common addresses appear much more often.
2. **Broken tuning loop** — `pickParamToTune` always returns `LINK_THRESHOLD` in FP-dominant mode because `fpDetails` never has `confusingSignal` populated (the `measureAccuracy` function only populates `confusingSignal` for trap-based FPs, not for cross-canonical-customer profile merges). This means `signalFpCount` is always empty → always falls through to the LINK_THRESHOLD fallback → tests the same already-rejected change every iteration.
3. **Harness/production linker divergence** — `localLinker.ts` uses `addWeakPairsSelective` for name and email_username; production `lib/linker.ts` uses unrestricted `addSignalPairsFrom` for both. Tuning results don't transfer to production.
4. **Scoring weight inconsistency** — `lib/scorer.ts` IDENTITY_SIGNAL_WEIGHTS (card=35, phone=30, device=30, account=30, email=25) differ from `lib/linker.ts` FAMILY_TIERS (card_fingerprint=30, phone=30, device=30, account=25, email=20). The scorer and linker are not calibrated against each other.
5. **Synthetic data quality** — datasets use only 20 first names × 20 last names (400 combinations) and 10 UK postcodes. At 75k orders, most name-bucket groups are enormous, flooding the name index. Real-world data has far more diversity.

---

## 2. System Architecture

```
scripts/tune/
  run.ts              — Entry point; orchestrates 6 phases
  generateDatasets.ts — Phase 2: creates 30 synthetic datasets
  localLinker.ts      — Parameterised copy of lib/linker.ts (tunable weights)
  localPipeline.ts    — Wraps localLinker; converts SyntheticOrder → profileId map
  measureAccuracy.ts  — Pair-based accuracy vs ground truth (O(n))
  tuningLoop.ts       — Phase 4: hillclimb loop (BROKEN — see §4)
  mockSupabase.ts     — In-memory mock Supabase store
  config.ts           — DEFAULT_CONFIG with all 26 TuneConfig fields
  types.ts            — TypeScript interfaces

lib/
  linker.ts           — Production identity linker (1098 lines)
  scorer.ts           — Behavioural + signal scorer (656 lines)
  confidence.ts       — Grade conversion (19 lines)

test-data/tune/
  dataset_{size}_{idx}_orders.json       — 30 datasets × 2 files
  dataset_{size}_{idx}_ground_truth.json
  report.json                            — Final tuning report
```

### Data flow (tuning harness)
```
SyntheticOrder[]
  → localPipeline.runLocalPipeline(orders, cfg)
    → localLinker.linkIdentitiesLocal(input, cfg)
      → normalize → build indexes → generate candidate pairs
      → score each pair with cfg weights
      → union-find clusters above cfg.LINK_THRESHOLD
    → Map<orderId, profileId>
  → measureAccuracy.measureAccuracy(gt, orderToProfile, n)
    → pair-based TP/FP/FN computation (O(n))
  → AccuracyResult { f1, precision, recall, ... }
```

### Signal pipeline in the linker
The linker works in 5 stages:

**Stage 1 — Normalise** each order's signals (email de-aliasing, phone digit normalisation, address token-sort, card hash, etc.)

**Stage 2 — Build indexes** (inverted index: signal value → list of order IDs)

**Stage 3 — Generate candidate pairs:**
- **Strong (unrestricted):** card, phone, device, account, email, shipping_address (max=200), billing_address (max=200)
- **Weak (selective expansion only):** phone_partial, name, name_bucket, email_username — only adds pairs where at least one order is already in the pair set from Stage 3

**Stage 4 — Score each pair** using configurable weights; apply anchor rule (pair must have ≥1 personal signal: phone/device/account/email/card)

**Stage 5 — Union-find** all pairs scoring ≥ `LINK_THRESHOLD` into clusters

### Configurable parameters (TuneConfig — 26 fields)
```typescript
// Linker thresholds
LINK_THRESHOLD: 30       // min score to link two orders
POSSIBLE_THRESHOLD: 15   // min score for "possible" match

// Signal weights (linker)
phone_exact: 30, phone_partial: 15
device_exact: 30
account_exact: 25
shipping_exact: 22, shipping_partial: 12
billing_exact: 22, billing_partial: 12, billing_cross: 18
email_exact: 20, email_username: 15
name_exact: 18, name_fuzzy: 10
card_fingerprint: 30, card_full: 12, card_last4: 8
postcode_full: 10, postcode_outward: 5
ip_exact: 8, ip_subnet: 4

// Entity resolution gates (not tuned yet)
ER_IP_RISK_GATE: 50, ER_CONF_EMAIL: 99, ER_CONF_CARD: 90
ER_CONF_IP_ADDR: 85, ER_CONF_IP_ONLY: 60
```

---

## 3. Tuning Run Results

### Phase 3 — Baseline (train datasets only)
- **20 datasets**: 10 × 10k + 10 × 30k
- **F1 = 56.03%**, P = 40.67%, R = 90.05%
- TP = 504,650 | FP = 736,257 | FN = 55,768
- **Mode: FP-dominant** (FP ≈ 13× FN in weighted terms)

### Phase 4 — Tuning loop
| Iter | Param | Before → After | F1 Before → After | Accepted? |
|------|-------|----------------|-------------------|-----------|
| 1 | LINK_THRESHOLD | 30 → 32 | 56.03% → 56.48% | ✓ |
| 2 | LINK_THRESHOLD | 32 → 34 | 56.48% → 54.84% | ✗ |
| 3 | LINK_THRESHOLD | 32 → 34 | 56.48% → 54.84% | ✗ |
| 4 | LINK_THRESHOLD | 32 → 34 | 56.48% → 54.84% | ✗ |
| 5 | LINK_THRESHOLD | 32 → 34 | 56.48% → 54.84% | ✗ |
| 6 | LINK_THRESHOLD | 32 → 34 | 56.48% → 54.84% | ✗ |
| 7 | LINK_THRESHOLD | 32 → 34 | 56.48% → 54.84% | ✗ |
| 8 | LINK_THRESHOLD | 32 → 34 | 56.48% → 54.84% | ✗ |
| 9 | LINK_THRESHOLD | 32 → 34 | 56.48% → 54.84% | ✗ |

- **Stop reason:** plateau (8 consecutive non-improving iterations)
- **Best config:** only `LINK_THRESHOLD: 32` differs from baseline

### Phase 5 — Validation (75k held-out datasets)
| Dataset | F1 | Precision | Recall | TP | FP | FN |
|---------|----|-----------|--------|----|----|-----|
| ds_75000_0 | 28.79% | 17.07% | 92.1% | 96,573 | 469,515 | 8,303 |
| ds_75000_1 | 28.64% | 17.00% | 91.3% | 95,734 | 467,876 | 9,103 |
| ds_75000_2 | 29.42% | 17.54% | 91.3% | 95,349 | 448,504 | 9,061 |
| ds_75000_3 | 28.83% | 17.09% | 91.9% | 96,594 | 468,380 | 8,464 |
| ds_75000_4 | 29.58% | 17.65% | 91.4% | 95,869 | 447,495 | 8,957 |
| ds_75000_5 | 29.97% | 17.94% | 91.5% | 96,572 | 442,282 | 8,970 |
| ds_75000_6 | 28.48% | 16.87% | 91.7% | 96,439 | 475,491 | 8,805 |
| ds_75000_7 | 28.21% | 16.68% | 91.6% | 95,715 | 478,451 | 8,756 |
| ds_75000_8 | 28.58% | 17.00% | 91.4% | 95,448 | 468,008 | 9,001 |
| ds_75000_9 | 28.85% | 17.14% | 91.1% | 95,856 | 463,544 | 9,357 |
| **AVG** | **28.93%** | **17.18%** | **91.54%** | ~96k | ~462k | ~8.9k |

**Interpretation:** Recall is excellent (91.5%) — the linker finds almost all true matches. Precision is catastrophic (17.2%) — for every 1 true link, there are ~5 false links. The FP:TP ratio degrades from ~1.4:1 at 10k scale to ~4.8:1 at 75k scale.

### Best config (final recommended by tuner)
```json
{
  "LINK_THRESHOLD": 32,
  "POSSIBLE_THRESHOLD": 15,
  "phone_exact": 30, "phone_partial": 15,
  "device_exact": 30, "account_exact": 25,
  "shipping_exact": 22, "shipping_partial": 12,
  "billing_exact": 22, "billing_partial": 12, "billing_cross": 18,
  "email_exact": 20, "email_username": 15,
  "name_exact": 18, "name_fuzzy": 10,
  "card_fingerprint": 30, "card_full": 12, "card_last4": 8,
  "postcode_full": 10, "postcode_outward": 5,
  "ip_exact": 8, "ip_subnet": 4,
  "ER_IP_RISK_GATE": 50, "ER_CONF_EMAIL": 99, "ER_CONF_CARD": 90,
  "ER_CONF_IP_ADDR": 85, "ER_CONF_IP_ONLY": 60
}
```

---

## 4. Root Cause Diagnosis

### Bug 1 — Tuning loop always tests LINK_THRESHOLD (never explores signal weights)

**Location:** `scripts/tune/tuningLoop.ts` → `pickParamToTune()`

**How it breaks:**

```typescript
// In tuningLoop.ts pickParamToTune:
const signalFpCount = new Map<string, number>();
for (const ds of agg.perDataset) {
  for (const detail of ds.fpDetails) {
    if (detail.confusingSignal) {   // ← THIS IS ALWAYS UNDEFINED
      signalFpCount.set(...)
    }
  }
}

if (signalFpCount.size > 0 && strategy < 2) {
  // ← NEVER REACHED because signalFpCount is always empty
}
// Falls through to:
if (cfg.LINK_THRESHOLD < 50) {
  return { param: 'LINK_THRESHOLD', direction: 1, ... }
  // ← ALWAYS RETURNS THIS
}
```

**Why `confusingSignal` is always undefined:**

In `measureAccuracy.ts`, `fpDetails` entries for cross-canonical-customer merges (the main FP source) are created like this:

```typescript
fpDetails.push({
  orderId_a: oidA,
  orderId_b: oidB,
  type: 'false_positive',
  canonicalId_a: canonIds[0],
  canonicalId_b: canonIds[1],
  assignedProfileId_a: pid,
  assignedProfileId_b: pid,
  // ← confusingSignal is NOT SET HERE
});
```

`confusingSignal` is only set for `FalsePositiveTrap`-sourced FPs (the explicit trap list), which represent a small fraction of FPs. The vast majority of FPs come from cross-canonical merges where `confusingSignal` is never populated.

**Result:** After iter 1 accepts LINK_THRESHOLD 30→32, `cfg.LINK_THRESHOLD` becomes 32. Iters 2-9 all call `pickParamToTune` which returns `{param: 'LINK_THRESHOLD', direction: 1}` → proposes 32→34 every time. It's rejected every time (F1 drops). `cfg` is never updated when rejected, so it remains 32. Iter 3 again reads `cfg.LINK_THRESHOLD=32` and proposes 32→34. This repeats 8 times until plateau.

**Fix:** In `measureAccuracy.ts`, when building fpDetails for cross-canonical merges, populate `confusingSignal` by looking at which signal the two orders share. Alternatively (simpler): in `tuningLoop.ts pickParamToTune`, add a fallback to cycle through signal weight parameters when LINK_THRESHOLD has already been tried and rejected.

---

### Bug 2 — FP explosion at 75k scale (fundamental algorithmic problem)

**Root cause:** The synthetic dataset generator creates persons from pools of only 20 first names × 20 last names = 400 name combinations, and 10 UK postcodes. At 75k orders, the average name appears 75,000/400 = 187 times. At 10k, it's 25 times.

In `localLinker.ts`, `shipping_full` and `billing_full` use `addPairsFromIdx(..., max=200)`. This means any address shared by >2 and ≤200 orders generates all pairs. At 75k, common addresses (especially since there are only 10 streets × 10 postcodes = 100 combinations) appear ~750 times, but max=200 caps the expansion. However, the anchor rule is satisfied whenever any two co-addressed orders also share a phone/email/device/card, which is common when name+address co-occurs (same person at same address in multiple orders).

The actual problem is that **legitimate re-use of addresses** (family members, flatmates, office buildings) at scale generates massive FP clusters. The anchor rule doesn't help if two different people happen to share a card (card_last4=same 4 digits) — at 75k orders, with 9,999 possible last4 values, on average 7.5 orders share each last4. Combined with address, this easily crosses the LINK_THRESHOLD of 32: `card_last4(8) + shipping_exact(22) = 30`, `card_last4(8) + shipping_exact(22) + postcode(10) = 40`.

**Fix options:**
1. **Raise minimum required score for address+card_last4 combinations** — add a special rule: pairs anchored only on card_last4 (not card_full or card_fingerprint) + address must score ≥ 50 (not 32)
2. **Require two independent personal signals** for a link to be accepted — a single card_last4 should not be enough to anchor a link
3. **Improve synthetic data** — expand name/address pools by 10× so 75k orders don't produce degenerate collision frequencies
4. **Add population-aware scoring** — if a signal value appears in >N orders (e.g. N=5 for card_last4, N=10 for address), treat it as a weaker signal

---

### Bug 3 — Local linker vs production linker divergence

| | `localLinker.ts` (tuning harness) | `lib/linker.ts` (production) |
|-|-----------------------------------|------------------------------|
| name pairs | `addWeakPairsSelective` (selective) | `addSignalPairsFrom` max=500 (unrestricted) |
| email_username pairs | `addWeakPairsSelective` (selective) | `addSignalPairsFrom` max=500 (unrestricted) |

Production `lib/linker.ts` generates far more FP pairs than the harness. Any threshold tuned in the harness will be too low for production. The threshold changes must be applied in sync with the same algorithmic changes.

**Fix:** Either (a) update `lib/linker.ts` to also use `addWeakPairsSelective` for name and email_username (the safer fix, and the intent of the comment in localLinker.ts), or (b) make localLinker.ts use the same unrestricted `addSignalPairsFrom` as production so tuning reflects reality.

---

### Bug 4 — Scorer/linker weight inconsistency

`lib/scorer.ts` `IDENTITY_SIGNAL_WEIGHTS`:
```typescript
card: 35, phone: 30, device: 30, account: 30, email: 25, postcode: 10, ip: 10
```

`lib/linker.ts` `FAMILY_TIERS`:
```typescript
card_fingerprint: 30, phone_exact: 30, device_exact: 30,
account_exact: 25, email_exact: 20, postcode_full: 10, ip_exact: 8
```

The scorer ranks `card` higher than the linker (35 vs 30), and `account` higher (30 vs 25). The scorer and linker were not calibrated together. This means the confidence grade the scorer assigns may not align with the link confidence the linker computed. Not a direct cause of the F1 problem but creates UI/UX inconsistency.

---

## 5. Recommended Fixes

### Fix 1 — Patch `tuningLoop.ts` to actually explore signal weights (IMMEDIATE)

In `pickParamToTune`, when in FP-dominant mode and `signalFpCount` is empty, cycle through signal weight parameters instead of always returning `LINK_THRESHOLD`:

```typescript
// Replace the FP fallback block:
if (mode === 'fp') {
  // ... existing signalFpCount logic ...

  // NEW: Cycle through signal weights in FP-dominant mode
  const fpSignalCycle: TunableWeight[] = [
    'shipping_exact', 'billing_exact', 'name_exact', 'card_last4',
    'email_username', 'phone_partial', 'postcode_full', 'ip_exact',
  ];
  const cycleParam = fpSignalCycle[iteration % fpSignalCycle.length];
  if (cfg[cycleParam] > 4) {
    return { param: cycleParam, direction: -1,
      reasoning: `FP-dominant: cycling through signal weights, reducing ${cycleParam}` };
  }

  // Last resort: raise LINK_THRESHOLD
  if (cfg.LINK_THRESHOLD < 50) {
    return { param: 'LINK_THRESHOLD', direction: 1,
      reasoning: `Raising LINK_THRESHOLD to reduce FP (FP-dominant mode)` };
  }
}
```

Also fix `pickParamToTune` to track which LINK_THRESHOLD changes have been tried and rejected (pass a `rejectedChanges: Set<string>` parameter) to avoid re-testing the same rejected change.

### Fix 2 — Populate `confusingSignal` in `measureAccuracy.ts` (IMMEDIATE)

To enable signal-weight tuning, we need to know which signal caused each FP. Modify `measureAccuracy.ts` to detect the shared signal between two falsely-merged orders:

```typescript
// In the FP-from-cross-canonical-merges section:
// After we have oidA and oidB, look up their signals in the localLinker output
// to find what they shared. This requires passing the linker's linkedPairs data
// into measureAccuracy, or storing it in the pipeline result.
```

The simplest approach: pass the `linkedPairs` from `localLinker.ts` through `localPipeline.ts` into `measureAccuracy.ts`, then for each FP pair, find the matching `linkedPair` and read its `.signals` array to set `confusingSignal`.

### Fix 3 — Fix the scale generalisation gap (CORE FIX)

**Option A (recommended): Raise the effective threshold for weak-anchor links**

In `localLinker.ts` (and `lib/linker.ts`), add a second threshold for pairs whose highest-weight signal is `card_last4` or `postcode` (weak anchors):

```typescript
// After scoring:
const maxSignalWeight = Math.max(...fired.map(f => f.weight));
const isWeakAnchor = !fired.some(f =>
  ['card_fingerprint', 'card_full', 'phone', 'device', 'account', 'email'].includes(f.family)
  && f.tier !== 'partial'
);
const effectiveThreshold = isWeakAnchor
  ? cfg.LINK_THRESHOLD + 15  // require stronger corroboration for weak anchors
  : cfg.LINK_THRESHOLD;
if (score >= effectiveThreshold) { ... }
```

**Option B: Require signal diversity**

Require that a link passes at least 2 distinct signal families (not just a high-scoring single signal). This prevents card_last4 + shipping_address from merging two random people who happened to have the same last 4 digits.

**Option C: Improve synthetic data diversity**

Expand `generateDatasets.ts` data pools:
```typescript
// From:
const FIRST_NAMES = [...20 names...];
const LAST_NAMES = [...20 names...];
const UK_POSTCODES = [...10 postcodes...];

// To:
// Load from a 1000-name pool, 500 postcode pool
// This reduces collision frequency at 75k by 50×
```

### Fix 4 — Sync `lib/linker.ts` with `localLinker.ts` (PRODUCTION FIX)

In `lib/linker.ts`, replace the unrestricted pair generation for name and email_username:

```typescript
// BEFORE (lines ~600-620 in lib/linker.ts):
addSignalPairsFrom(ix.name, 'name', pairs);
addSignalPairsFrom(ix.email_username, 'email', pairs);

// AFTER:
addWeakPairsSelective(ix.name, 'name', pairs);
addWeakPairsSelective(ix.email_username, 'email', pairs);
```

This makes production consistent with the tuning harness and prevents the O(n²) FP explosion for common names.

### Fix 5 — Reset plateau counter when strategy changes

In `tuningLoop.ts`, the plateau counter should only trigger if the **same parameter** keeps failing. If we change strategy (different parameter), reset plateau:

```typescript
let lastParamTried: keyof TuneConfig | null = null;
let consecutiveSameParamRejections = 0;

// In the loop:
if (param === lastParamTried && !improved) {
  consecutiveSameParamRejections++;
} else {
  consecutiveSameParamRejections = 0;
  lastParamTried = param;
}
if (consecutiveSameParamRejections >= PLATEAU_WINDOW) { stopReason = 'plateau'; break; }
```

---

## 6. Source: `lib/linker.ts`

> Production identity linker (1098 lines). **Key differences vs localLinker.ts:** uses `addSignalPairsFrom` (unrestricted, max=500) for name and email_username; all weights are hardcoded constants, not TuneConfig fields.

Key hardcoded constants:
```typescript
const LINK_THRESHOLD = 30;
const POSSIBLE_THRESHOLD = 15;

const FAMILY_TIERS = {
  phone:    { exact: 30, partial: 15 },
  device:   { exact: 30 },
  account:  { exact: 25 },
  shipping_address: { exact: 22, partial: 12 },
  billing_address:  { exact: 22, partial: 12, cross: 18 },
  email:    { exact: 20, username: 15 },
  name:     { exact: 18, fuzzy: 10 },
  card:     { fingerprint: 30, full: 12, last4: 8 },
  postcode: { full: 10, outward: 5 },
  ip:       { exact: 8, subnet: 4 },
};
```

Normalisation functions (mirrored in localLinker.ts):
- `normaliseEmail` — strips dots, `+` tags, lowercases
- `normalisePhone` — converts to international `44XXXXXXXXXX`
- `normaliseAddress` — lowercases, removes punctuation, sorts tokens, expands abbreviations
- `normalisePostcode` — uppercases, removes spaces
- `normaliseCard` — SHA256 fingerprint if available, else `BIN-last4` or `last4` only
- `normaliseName` — lowercases, handles `Last, First` format
- `emailUsername` — alpha chars of local part (≥4 chars)
- `guardIP` — rejects short strings (country codes), guards against IP=currency code collisions
- `guardCard` — rejects strings containing `.` (IP masquerading as card)

Stage 3 pair generation:
```typescript
// Strong signals — unrestricted
addSignalPairsFrom(ix.card,    'card',    pairs);
addSignalPairsFrom(ix.phone,   'phone',   pairs);
addSignalPairsFrom(ix.device,  'device',  pairs);
addSignalPairsFrom(ix.account, 'account', pairs);
addSignalPairsFrom(ix.email,   'email',   pairs);
addSignalPairsFrom(ix.shipping_full, 'shipping_address', pairs, 200);
addSignalPairsFrom(ix.billing_full,  'billing_address',  pairs, 200);
// Weak signals — unrestricted (BUG vs localLinker.ts which uses selective)
addSignalPairsFrom(ix.name,           'name',  pairs);      // max=500
addSignalPairsFrom(ix.email_username, 'email', pairs);      // max=500
// Selective expansion
addWeakPairsSelective(ix.phone_partial, 'phone', pairs);
addWeakPairsSelective(ix.name_bucket,   'name',  pairs);
```

Anchor rule (prevents weak-signal-only links):
```typescript
const hasPersonal = fired.some(f =>
  ['phone','device','account','email','card'].includes(f.family)
);
if (!hasPersonal) return { score: 0, signals: [], evidence: [] };
```

---

## 7. Source: `lib/scorer.ts`

> Behavioural + signal scorer (656 lines). Adds behavioural risk signals on top of the linker output. **Note inconsistent weights vs linker.**

Key weights:
```typescript
const IDENTITY_SIGNAL_WEIGHTS: Record<string, number> = {
  card: 35, phone: 30, device: 30, account: 30,
  email: 25, postcode: 10, ip: 10,
};
// Grade thresholds (DIFFERENT from lib/confidence.ts):
// DEFINITE: score >= 85, PROBABLE: >= 60, POSSIBLE: >= 35
```

lib/confidence.ts grade thresholds (used elsewhere in UI):
```typescript
if (score >= 90) return 'A';
if (score >= 75) return 'B';
if (score >= 60) return 'C';
if (score >= 45) return 'D';
return 'F';
```

Behavioural scoring caps:
- elevated_refund_rate: max 20 pts
- fast_claim_velocity: max 15 pts
- denial_then_chargeback: max 20 pts
- value_escalation: max 10 pts
- reason_rotation: max 8 pts
- multiple_chargebacks: max 15 pts
- **Total behavioural capped at 40 pts**

CE 3.0 eligibility check: requires a disputed order + 2+ prior orders placed 120+ days earlier with 2+ matching signals.

---

## 8. Source: `lib/confidence.ts`

```typescript
export type ConfidenceGradeValue = 'A' | 'B' | 'C' | 'D' | 'F';

export function scoreToGrade(score: number): ConfidenceGradeValue {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

export function riskLevelToNewGrade(level: string | null | undefined): ConfidenceGradeValue {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return 'F';
    case 'high':     return 'D';
    case 'medium':   return 'C';
    case 'low':      return 'B';
    default:         return 'C';
  }
}
```

---

## 9. Source: `scripts/tune/types.ts`

```typescript
export interface CanonicalCustomer {
  id: string;
  orderIds: string[];
  scenario: string;
  availableSignals: SignalType[];
  minExpectedConfidence?: number;
}

export interface FalsePositiveTrap {
  orderIds: string[];
  reason: string;
  sharedSignal: SignalType;
}

export interface GroundTruth {
  datasetId: string;
  canonicalCustomers: CanonicalCustomer[];
  genuinelyNewOrders: string[];
  falsePositiveTraps: FalsePositiveTrap[];
}

export type SignalType =
  | 'email_exact' | 'email_variant'
  | 'card_full' | 'card_last4' | 'card_fingerprint'
  | 'ip_exact' | 'ip_subnet'
  | 'address_exact' | 'address_partial'
  | 'phone_exact' | 'phone_partial'
  | 'device_exact' | 'account_exact'
  | 'name_exact' | 'name_fuzzy' | 'none';

export interface AccuracyResult {
  datasetId: string;
  totalOrders: number;
  truePairs: number;
  falsePairs: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  fpDetails: FailureDetail[];
  fnDetails: FailureDetail[];
}

export interface FailureDetail {
  orderId_a: string;
  orderId_b: string;
  type: 'false_positive' | 'false_negative';
  confusingSignal?: SignalType;      // Only set for FalsePositiveTrap FPs — BUG
  missedSignals?: SignalType[];
  canonicalId_a?: string;
  canonicalId_b?: string;
  assignedProfileId_a: string;
  assignedProfileId_b: string;
}

export interface TuneConfig {
  LINK_THRESHOLD: number;
  POSSIBLE_THRESHOLD: number;
  phone_exact: number;    phone_partial: number;
  device_exact: number;
  account_exact: number;
  shipping_exact: number; shipping_partial: number;
  billing_exact: number;  billing_partial: number; billing_cross: number;
  email_exact: number;    email_username: number;
  name_exact: number;     name_fuzzy: number;
  card_fingerprint: number; card_full: number; card_last4: number;
  postcode_full: number;  postcode_outward: number;
  ip_exact: number;       ip_subnet: number;
  ER_IP_RISK_GATE: number; ER_CONF_EMAIL: number; ER_CONF_CARD: number;
  ER_CONF_IP_ADDR: number; ER_CONF_IP_ONLY: number;
}

export interface TuningLogEntry {
  iteration: number;
  paramChanged: keyof TuneConfig;
  previousValue: number;
  newValue: number;
  reasoning: string;
  beforeF1: number;
  afterF1: number;
  beforePrecision: number;
  afterPrecision: number;
  beforeRecall: number;
  afterRecall: number;
  accepted: boolean;
  dominantFailureMode: 'fp' | 'fn' | 'balanced';
}

export interface SyntheticOrder {
  order_id: string;
  customer_email: string | null;
  customer_name: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  device_ip: string | null;
  card_last4: string | null;
  card_bin: string | null;
  card_fingerprint: string | null;
  device_fingerprint: string | null;
  account_id: string | null;
  phone: string | null;
  postcode: string | null;
  order_date: string;
  order_value: number;
  order_status: string;
  refund_status: string | null;
  refund_reason: string | null;
  refund_date: string | null;
  payment_method: string | null;
  _canonicalCustomerId: string;
  _scenario: string;
}
```

---

## 10. Source: `scripts/tune/config.ts`

```typescript
import type { TuneConfig } from './types';

export const DEFAULT_CONFIG: TuneConfig = {
  LINK_THRESHOLD: 30,
  POSSIBLE_THRESHOLD: 15,
  phone_exact: 30,      phone_partial: 15,
  device_exact: 30,
  account_exact: 25,
  shipping_exact: 22,   shipping_partial: 12,
  billing_exact: 22,    billing_partial: 12,  billing_cross: 18,
  email_exact: 20,      email_username: 15,
  name_exact: 18,       name_fuzzy: 10,
  card_fingerprint: 30, card_full: 12,        card_last4: 8,
  postcode_full: 10,    postcode_outward: 5,
  ip_exact: 8,          ip_subnet: 4,
  ER_IP_RISK_GATE: 50,
  ER_CONF_EMAIL: 99,
  ER_CONF_CARD: 90,
  ER_CONF_IP_ADDR: 85,
  ER_CONF_IP_ONLY: 60,
};

export function cloneConfig(c: TuneConfig): TuneConfig {
  return { ...c };
}
```

---

## 11. Source: `scripts/tune/localLinker.ts`

> 611-line parameterised clone of `lib/linker.ts`. Key difference: uses `addWeakPairsSelective` for name and email_username (vs production which uses unrestricted `addSignalPairsFrom`). Address index capped at max=200.

**Critical section — Stage 3 pair generation:**
```typescript
// Strong signals — unrestricted (can anchor a link)
addPairsFromIdx(ix.card,           'card',             pairs);
addPairsFromIdx(ix.phone,          'phone',            pairs);
addPairsFromIdx(ix.device,         'device',           pairs);
addPairsFromIdx(ix.account,        'account',          pairs);
addPairsFromIdx(ix.email,          'email',            pairs);
addPairsFromIdx(ix.shipping_full,  'shipping_address', pairs, 200);  // max=200
addPairsFromIdx(ix.billing_full,   'billing_address',  pairs, 200);  // max=200

// Weak signals — SELECTIVE (only annotate existing pairs)
addWeakPairsSelective(ix.phone_partial, 'phone', pairs);
addWeakPairsSelective(ix.name,          'name',  pairs);  // ← DIFFERENT from production
addWeakPairsSelective(ix.name_bucket,   'name',  pairs);
addWeakPairsSelective(ix.email_username,'email', pairs);  // ← DIFFERENT from production
```

**`addWeakPairsSelective` function:**
```typescript
function addWeakPairsSelective(
  idx: Idx, sig: LinkerSignal, pairs: Map<string, PairAcc>,
  maxGroup = 50, maxExpand = 25
): void {
  // Collect all orders already in the pair set
  const suspicious = new Set<string>();
  for (const acc of pairs.values()) {
    suspicious.add(acc.order_id_a);
    suspicious.add(acc.order_id_b);
  }
  for (const ids of idx.values()) {
    if (ids.length < 2) continue;
    const u = Array.from(new Set(ids));
    if (u.length <= maxGroup) {
      // Small group: expand all pairs
      for (let i = 0; i < u.length; i++)
        for (let j = i + 1; j < u.length; j++)
          addPair(u[i], u[j], sig, pairs);
    } else {
      // Large group: only expand pairs involving suspicious orders
      const anchors = u.filter(id => suspicious.has(id));
      for (const anchor of anchors) {
        const candidates = u.filter(id => id !== anchor).slice(0, maxExpand);
        for (const c of candidates) addPair(anchor, c, sig, pairs);
      }
    }
  }
}
```

**Scoring (configurable weights via cfg):**
```typescript
function scorePair(a, b, crossAddr): { score, signals, evidence } {
  // phone exact: cfg.phone_exact (30), partial: cfg.phone_partial (15)
  // device exact: cfg.device_exact (30)
  // account exact: cfg.account_exact (25)
  // shipping exact: cfg.shipping_exact (22), partial (Jaccard≥0.75): cfg.shipping_partial (12)
  // billing exact: cfg.billing_exact (22), partial: cfg.billing_partial (12)
  // billing cross (ship=billing of other): cfg.billing_cross (18)
  // email exact: cfg.email_exact (20)
  // email username (same username, diff domain): cfg.email_username (15)
  // name exact: cfg.name_exact (18)
  // name fuzzy (same bucket, Levenshtein≤2): cfg.name_fuzzy (10)
  // card fingerprint: cfg.card_fingerprint (30)
  // card full (BIN+last4): cfg.card_full (12)
  // card last4 only: cfg.card_last4 (8)
  // postcode full: cfg.postcode_full (10)
  // postcode outward (e.g. SW1A): cfg.postcode_outward (5)
  // ip exact: cfg.ip_exact (8)
  // ip subnet (/24): cfg.ip_subnet (4)
  //
  // Anchor rule: MUST have ≥1 of: phone/device/account/email/card
  // If no anchor, score=0 (pair dropped)
}
```

---

## 12. Source: `scripts/tune/localPipeline.ts`

```typescript
export function runLocalPipeline(
  orders: SyntheticOrder[],
  cfg: TuneConfig,
  store: MockStore,
): PipelineResult {
  store.reset();
  const linkerInput = toLinkerInput(orders);  // converts SyntheticOrder → LocalLinkerInput
  const linkerResult = linkIdentitiesLocal(linkerInput, cfg);

  // Build stable UUIDs per cluster
  const clusterToProfile = new Map<string, string>();
  for (const cluster of linkerResult.clusters) {
    clusterToProfile.set(cluster.cluster_id, randomUUID());
  }

  // Map order_id → profileId
  const orderToProfile = new Map<string, string>();
  for (const order of orders) {
    const clusterId = linkerResult.orderToCluster.get(order.order_id);
    if (clusterId !== undefined) {
      orderToProfile.set(order.order_id, clusterToProfile.get(clusterId)!);
    } else {
      orderToProfile.set(order.order_id, randomUUID()); // singleton
    }
  }

  return { orderToProfile, profileCount: store.profiles.size };
}
```

---

## 13. Source: `scripts/tune/measureAccuracy.ts`

O(n) pair-based accuracy (no quadratic loops).

**Algorithm:**
1. Build `orderId → canonicalId` from ground truth
2. Build `profileId → Map<canonicalId, count>` from engine output
3. Build `canonicalId → Map<profileId, count>` from engine output
4. For each canonical customer (k orders): `truePairs = k*(k-1)/2`, `TP = Σ (cnt*(cnt-1)/2)` over profiles containing this customer's orders, `FN = truePairs - TP`
5. For each profile with orders from n>1 canonical customers: `FP += n*(n-1)/2`
6. For FalsePositiveTrap groups: check if any two orders share a profile

**Bug (affects tuning loop):** In step 5, when creating `fpDetails` entries, `confusingSignal` is NOT populated — it's left undefined. Only step 6 (FalsePositiveTrap) sets `confusingSignal`. This means `tuningLoop.ts` can never determine which signal is causing FPs.

---

## 14. Source: `scripts/tune/tuningLoop.ts`

> **BROKEN.** See Bug 1 in §4 for full explanation.

Key constants:
```typescript
const TARGET_F1      = 0.97;   // goal
const PLATEAU_WINDOW = 8;      // stop if 8 consecutive non-improving iters
const MAX_ITERATIONS = 60;
const THRESHOLD_STEP     = 2;  // LINK_THRESHOLD change size
const SIGNAL_WEIGHT_STEP = 3;  // signal weight change size
```

`dominantMode()`:
```typescript
function dominantMode(agg: AggregateAccuracy): 'fp' | 'fn' | 'balanced' {
  const fpRate = agg.totalFP / Math.max(1, agg.totalTP + agg.totalFP);
  const fnRate = agg.totalFN / Math.max(1, agg.totalTP + agg.totalFN);
  if (fpRate > fnRate * 1.5) return 'fp';
  if (fnRate > fpRate * 1.5) return 'fn';
  return 'balanced';
}
// At baseline: fpRate ≈ 0.59, fnRate ≈ 0.10 → fp-dominant (correct)
```

`SIGNAL_PARAM_MAP` (signal type → TuneConfig key):
```typescript
{
  email_exact: 'email_exact',    email_variant: 'email_username',
  card_fingerprint: 'card_fingerprint', card_full: 'card_full', card_last4: 'card_last4',
  phone_exact: 'phone_exact',    phone_partial: 'phone_partial',
  device_exact: 'device_exact',  account_exact: 'account_exact',
  address_exact: 'shipping_exact', address_partial: 'shipping_partial',
  ip_exact: 'ip_exact',          ip_subnet: 'ip_subnet',
  name_fuzzy: 'name_fuzzy',      name_exact: 'name_exact',
}
```

The main loop: each iteration, reject if `newValue === prevValue` (boundary), otherwise test new config on all 20 training datasets, accept if F1 improves by >0.05%, save checkpoint.

---

## 15. Source: `scripts/tune/run.ts`

Entry point. Phases:
- **Phase 2:** `generateDatasets.ts` (skip with `--skip-generate`)
- **Phase 3:** Baseline on 20 training datasets (10k+30k)
- **Phase 4:** `runTuningLoop` on 20 training datasets
- **Phase 5:** Validation on 10 held-out 75k datasets
- **Phase 6:** Write `test-data/tune/report.json`

Flags: `--skip-generate`, `--resume` (resumes from `test-data/tune/checkpoint.json`)

**Run command:**
```bash
cd /Users/malikibrahim/Downloads/Unauth
node --max-old-space-size=4096 node_modules/.bin/ts-node \
  --transpile-only \
  --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
  scripts/tune/run.ts --skip-generate
```

Training set: 10×10k + 10×30k = 20 datasets (~25s/iter, ~25min for 60 iters)
Held-out: 10×75k (~2min total for Phase 5)

---

## 16. Source: `scripts/tune/generateDatasets.ts` (excerpt)

```typescript
const DATASET_SIZES = [10_000, 30_000, 75_000];
const DATASETS_PER_SIZE = 10;

// Scenario weights (problem: innocent_bystander_fp = 20% creates many traps)
const SCENARIO_WEIGHTS = [
  ['exact_email_match',         0.12],
  ['card_fingerprint_match',    0.10],
  ['card_last4_match',          0.08],
  ['phone_match',               0.08],
  ['device_fingerprint_match',  0.08],
  ['shipping_address_match',    0.07],
  ['ip_address_match',          0.05],
  ['name_fuzzy_match',          0.05],
  ['account_id_match',          0.06],
  ['multi_signal_fraud_ring',   0.11],
  ['innocent_bystander_fp',     0.20],  // ← FP traps (shared weak signal)
];

// ⚠️ PROBLEM: Only 20 first names × 20 last names = 400 name combos
// At 75k orders, avg name appears 187 times → huge name bucket collisions
const FIRST_NAMES = ['James','Sarah','Michael','Emma','David','Olivia','Daniel',
  'Sophia','Ryan','Chloe','Aiden','Grace','Liam','Mia','Noah','Ava',
  'Logan','Lily','Mason','Hannah'];
const LAST_NAMES = ['Smith','Johnson','Williams','Jones','Brown','Davis','Miller',
  'Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris',
  'Martin','Garcia','Thompson','Martinez','Robinson'];

// ⚠️ PROBLEM: Only 10 UK postcodes
// At 75k orders, avg postcode appears 7,500 times → massive postcode FPs
const UK_POSTCODES = ['SW1A 1AA','EC1A 1BB','W1A 0AX','M1 1AE','B1 1BB',
  'LS1 1BA','E1 6AN','N1 9GU','SE1 7PB','WC1A 1DT'];
```

**To fix the scale problem, at minimum expand to:**
- 500+ first names, 500+ last names (250k combos → avg 0.3 per 75k dataset)
- 500+ UK postcodes

---

## 17. Full Tuning Log

```
[02:51:23] === Autonomous Identity Engine Tuning System ===
[02:51:23] Skipping Phase 2 (--skip-generate flag set)
[02:51:23] Train: 20 datasets (10k+30k) | Held-out: 10 datasets (75k)

=== Phase 3: Baseline ===
Baseline → F1=56.03%  P=40.67%  R=90.05%
           TP=504650  FP=736257  FN=55768

=== Phase 4: Tuning Loop ===
[02:52:32] --- Iter 1/60 | bestF1=56.03% | plateau=0/8 ---
  Testing LINK_THRESHOLD: 30 → 32  (Raising LINK_THRESHOLD to reduce FP)
[02:53:10] [Iter 1] LINK_THRESHOLD: 30→32 | F1: 56.03%→56.48% | ✓ accepted | 38.3s

[02:53:10] --- Iter 2/60 | bestF1=56.48% | plateau=0/8 ---
  Testing LINK_THRESHOLD: 32 → 34  (Raising LINK_THRESHOLD to reduce FP)
[02:53:42] [Iter 2] LINK_THRESHOLD: 32→34 | F1: 56.48%→54.84% | ✗ rejected | 32.3s

[02:53:42] --- Iter 3/60 | bestF1=56.48% | plateau=1/8 ---
  Testing LINK_THRESHOLD: 32 → 34  (same change! — BUG: loop didn't change strategy)
[02:54:14] [Iter 3] LINK_THRESHOLD: 32→34 | F1: 56.48%→54.84% | ✗ rejected | 31.4s

[02:54:14] --- Iter 4/60 | bestF1=56.48% | plateau=2/8 ---
  Testing LINK_THRESHOLD: 32 → 34  (same change again)
[02:54:51] [Iter 4] LINK_THRESHOLD: 32→34 | F1: 56.48%→54.84% | ✗ rejected | 37.0s

[02:54:51] --- Iter 5/60 | bestF1=56.48% | plateau=3/8 ---
  Testing LINK_THRESHOLD: 32 → 34
[02:55:29] [Iter 5] LINK_THRESHOLD: 32→34 | F1: 56.48%→54.84% | ✗ rejected | 38.2s

[02:55:29] --- Iter 6/60 | bestF1=56.48% | plateau=4/8 ---
  Testing LINK_THRESHOLD: 32 → 34
[02:56:06] [Iter 6] LINK_THRESHOLD: 32→34 | F1: 56.48%→54.84% | ✗ rejected | 36.8s

[02:56:06] --- Iter 7/60 | bestF1=56.48% | plateau=5/8 ---
  Testing LINK_THRESHOLD: 32 → 34
[02:56:39] [Iter 7] LINK_THRESHOLD: 32→34 | F1: 56.48%→54.84% | ✗ rejected | 32.9s

[02:56:39] --- Iter 8/60 | bestF1=56.48% | plateau=6/8 ---
  Testing LINK_THRESHOLD: 32 → 34
[02:57:11] [Iter 8] LINK_THRESHOLD: 32→34 | F1: 56.48%→54.84% | ✗ rejected | 32.1s

[02:57:11] --- Iter 9/60 | bestF1=56.48% | plateau=7/8 ---
  Testing LINK_THRESHOLD: 32 → 34
[02:57:44] [Iter 9] LINK_THRESHOLD: 32→34 | F1: 56.48%→54.84% | ✗ rejected | 33.1s

[02:57:44] Plateau detected after 8 non-improving iterations.
[02:57:44] --- Final evaluation pass ---
  (20 training datasets with LINK_THRESHOLD=32)
  10k datasets: F1 72.6–73.7% (individual)
  30k datasets: F1 52.3–52.9% (individual)
  Best F1: 56.48%

=== Phase 5: Validation (75k) ===
Validation → F1=28.93%  P=17.18%  R=91.54%
  ds_75000_0: F1=28.79%  TP=96573  FP=469515  FN=8303
  ds_75000_1: F1=28.64%  TP=95734  FP=467876  FN=9103
  ds_75000_2: F1=29.42%  TP=95349  FP=448504  FN=9061
  ds_75000_3: F1=28.83%  TP=96594  FP=468380  FN=8464
  ds_75000_4: F1=29.58%  TP=95869  FP=447495  FN=8957
  ds_75000_5: F1=29.97%  TP=96572  FP=442282  FN=8970
  ds_75000_6: F1=28.48%  TP=96439  FP=475491  FN=8805
  ds_75000_7: F1=28.21%  TP=95715  FP=478451  FN=8756
  ds_75000_8: F1=28.58%  TP=95448  FP=468008  FN=9001
  ds_75000_9: F1=28.85%  TP=95856  FP=463544  FN=9357

=== Phase 6: Report written ===
Recommended threshold changes: LINK_THRESHOLD: 30 → 32
```

---

## 18. Report JSON Summary

Full path: `test-data/tune/report.json`

```json
{
  "generatedAt": "2026-05-13T03:00:05.723Z",
  "stopReason": "plateau",
  "bestF1": 0.5648,
  "paramChanges": [
    { "param": "LINK_THRESHOLD", "baseline": 30, "tuned": 32 }
  ],
  "tuningLog": [
    { "iteration": 1, "paramChanged": "LINK_THRESHOLD", "previousValue": 30, "newValue": 32,
      "beforeF1": 0.5603, "afterF1": 0.5648, "accepted": true, "dominantFailureMode": "fp" },
    { "iteration": 2, "paramChanged": "LINK_THRESHOLD", "previousValue": 32, "newValue": 34,
      "beforeF1": 0.5648, "afterF1": 0.5484, "accepted": false, "dominantFailureMode": "fp" },
    "... iterations 3-9: identical to iteration 2 ..."
  ],
  "finalMetrics": {
    "overallPrecision": 0.4140, "overallRecall": 0.9007, "overallF1": 0.5648,
    "totalTP": 506640, "totalFP": 717980, "totalFN": 55757
  }
}
```

---

## 19. How to Re-Run

### Prerequisites
```bash
cd /Users/malikibrahim/Downloads/Unauth
npm install  # ensure ts-node etc. are installed
```

### Run with existing datasets (skip generation)
```bash
node --max-old-space-size=4096 node_modules/.bin/ts-node \
  --transpile-only \
  --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
  scripts/tune/run.ts --skip-generate 2>&1 | tee /tmp/tune.log
```

### Resume from checkpoint
```bash
node --max-old-space-size=4096 node_modules/.bin/ts-node \
  --transpile-only \
  --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
  scripts/tune/run.ts --skip-generate --resume
```

### Regenerate datasets and run full pipeline
```bash
node --max-old-space-size=4096 node_modules/.bin/ts-node \
  --transpile-only \
  --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
  scripts/tune/run.ts
```

### Watch dashboard (separate terminal)
```bash
node scripts/tune/dashboard.mjs
```

### Files to edit before re-running (to fix the bugs)
1. `scripts/tune/tuningLoop.ts` — fix `pickParamToTune` to cycle signal weights
2. `scripts/tune/measureAccuracy.ts` — populate `confusingSignal` in FP details
3. `scripts/tune/generateDatasets.ts` — expand name/postcode pools
4. `scripts/tune/localLinker.ts` — optionally raise the weak-anchor threshold requirement
5. `lib/linker.ts` — sync with localLinker.ts (use `addWeakPairsSelective` for name/email_username)

### Expected runtime
- Phase 2 (generate datasets): ~5-10 min
- Phase 3 (baseline): ~1 min
- Phase 4 (60 iterations × ~30s): ~30 min
- Phase 5 (75k validation): ~2 min
- Total: ~35-45 min

---

*Document generated: 2026-05-13. All source code reflects the state of the repository at that date.*
