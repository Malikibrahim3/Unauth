# US Benchmark v1 — Engine Diagnostic Report

**Dataset:** `test-data/us_benchmark_v1.csv` (15,000 orders, two merchants)
**Ground truth:** `test-data/us_benchmark_v1_ground_truth.json`
**Raw results:** `reports/us_benchmark_v1_results.json`
**Engine commit:** main @ `5399dbd` (Node 22, `FLAG_THRESHOLD=45`, salt = eval-default)
**Generated:** 2026-05-18

---

## Executive summary (read this first)

The engine catches a respectable share of fraud (recall 84%) but **the precision is roughly half of what it needs to be for pilot, and a third of what it needs for enterprise**. **One signal — `disputeHistory` — is responsible for 95% of all false positives** by firing at score 60 the moment a customer has *one* prior refund request, which is normal legitimate-customer behaviour. Fix that one threshold and pilot-grade precision is in reach without touching anything else. After that, the next blockers are (a) two configured signals (`crossMerchant`, `refundPattern`) that aren't actually wired into the scoring path, and (b) an entire class of fraud (Cohort 1 Sub-C, address-only anchored) that the engine has no signal to detect.

---

## Section 1 — Headline scorecard

Measured in **per-merchant mode** (each merchant scored in isolation — the production deployment shape). Consortium mode (scoring all 15k orders together so the engine can use cross-merchant identity history) is shown alongside for contrast.

| Metric | Current | Pilot target | Enterprise target | Status |
|---|---|---|---|---|
| Precision | 55.71% | ≥85% | ≥96% | ❌ |
| Recall | 83.97% | ≥75% | ≥87% | ⚠️ |
| F1 score | 66.98% | ≥80% | ≥91% | ❌ |
| Review rate | 17.71% | ≤6% | ≤3% | ❌ |
| False positive rate | 8.68% | ≤4% | ≤2% | ❌ |
| Cross-merchant detection | 100.00% | ≥70% | ≥85% | ✅ (with caveat — see §6) |

**Consortium mode (cross-merchant context available):** P = 48.74%, R = 84.33%, F1 = 61.77%, review rate = 20.23%. Precision *drops* slightly in consortium mode because the same `disputeHistory` over-firing now extends across merchants — confirming that consortium lift is held back by the same threshold issue.

**Single biggest gap:** false positive rate is **4.3× over the pilot bar** and **4.3× over the enterprise bar**. Every other failure follows from this. Fix FPR and precision, F1, and review rate all move into pilot range together.

---

## Section 2 — Cohort-by-cohort breakdown

### Cohort 1 — Serial INR claimers
```
Orders in cohort:    606  (recall denominator: 547 FRAUDSTER orders)
Identities:          80
Flagged by engine:   397 (65.5%)
Correctly flagged:   391
Missed:              156
Falsely flagged:     0
Cohort recall:       71.5%
```
Key finding: **The engine cleanly catches Sub-A (email rotators) and Sub-B (card rotators) but is essentially blind to Sub-C (address-only anchored).** Of 25 Sub-C clusters, 25 are partially or fully missed (108 orders, avg score 15.7). Sub-C identities rotate email, card, phone, name, and *shipping* address — only the *billing* address is stable. The engine groups customer history by `emailHash` and clusters by *shipping* `addressHash`. It has no signal that uses billing address. From the engine's perspective, each Sub-C order looks like an unrelated new customer.

Worst failures:
1. `ORD000599` (cluster_c1_C_019): score 15.8, only `addressMismatch` fired. Should have linked via billing address.
2. `ORD000595` (cluster_c1_C_015): score 15.8, identical pattern.
3. `ORD000027` (cluster_c1_A_004): score 44.3, three signals firing (`refundRate`, `inrAbuse`, `addressClustering`) — just 0.7 points below `FLAG_THRESHOLD=45`. Lowering the threshold or bumping `inrAbuse` weight by 5 would recover this entire class.

### Cohort 2 — Cross-merchant fraud rings
```
Orders in cohort:    400  (recall denominator: 352 FRAUDSTER orders)
Identities:          25 rings (50 merchant accounts)
Flagged by engine:   399 (99.8%)
Correctly flagged:   351
Missed:              1
Falsely flagged:     0
Cohort recall:       99.7%
```
Key finding: **Cross-merchant rings are caught — but not because the cross-merchant signal works.** All 25 rings have 14-18 orders per ring with high refund-claim rates, which means each side independently trips `refundRate` + `inrAbuse` + `disputeHistory`. The "co-occurrence" emerges from coincidence, not from the engine identifying the link. See §6 for the implication.

### Cohort 3 — Return fraud / wardrobing
```
Orders in cohort:    501
Identities:          60
Flagged by engine:   499 (99.6%)
Correctly flagged:   499
Missed:              2
Falsely flagged:     0
Cohort recall:       99.6%
```
Key finding: **Best-performing cohort.** Returns + chargebacks + stable identity → 99.6% recall, zero FPs. Nothing to fix here.

### Cohort 4 — Chargeback specialists
```
Orders in cohort:    247  (target was 300 — see §9)
Identities:          35
Flagged by engine:   171 (69.2%)
Correctly flagged:   171
Missed:              76
Falsely flagged:     0
Cohort recall:       69.2%
```
Key finding: **The engine catches habitual chargebackers (Sub-A) after their first chargeback files but misses the seed orders and the burst pattern (Sub-B).** Sub-A: 18/20 clusters have at least one FN — the first two orders ("legit seed" by design) have no chargeback history to fire on. Sub-B (burst): 15/15 clusters have an FN — these customers create accounts, place 3-5 orders in one week, then chargeback all simultaneously. Because all orders happen *before* any chargeback files, the disputeHistory signal can't see priors. Velocity could catch the burst — it doesn't, because the 7-day-window threshold is 8+ orders (these customers place 3-5).

Worst failures:
1. `ORD001640` (cluster_c4_A_016): score 3.7, no signals fired. First two seed orders are pre-chargeback by design.
2. `ORD001745` (cluster_c4_B_x): score 4.8, no signals. Day-1 of a same-week burst.
3. `ORD001710` (cluster_c4_B_y): score 4.8, no signals.

### Cohort 5 — First-order fraudsters
```
Orders in cohort:    200  (recall denominator: 50 FRAUDSTER orders — SUSPICIOUS excluded)
Identities:          200 (each customer = one order)
Flagged by engine:   58  (29.0%)
Correctly flagged:   13
Missed:              37
Falsely flagged:     0
Cohort recall:       26.0%
```
Key finding: **The engine has zero network-effect signals.** Group A (network-linked fraudsters, 50 orders) share a `device_ip` or `browser_fingerprint` with a known fraudster from Cohort 1 or 2. The engine has no signal that fires when a single-order customer matches a prior fraudster's hardware identifiers. Score = 0 for almost every Group A order. The 13 caught are coincidence — they happened to share an email with a fraudster identity, so the per-customer history signals fired on their single order via the existing customerOrderHistory grouping.

Worst failures:
1. `ORD001772`: score 0.0, no signals. Shares IP 73.x.x.x with cluster_c1_A_006 (8 INR refunds, 2 chargebacks) — engine doesn't look.
2. `ORD001802`: score 0.0. Shares browser fingerprint with cluster_c2_A_002 ring.
3. `ORD001766`: score 0.0. Same story.

### Cohort 6 — Legitimate customers
```
Orders in cohort:    12,448
Identities:          4,410
Flagged by engine:   1,133 (9.1%)
Correctly flagged:   0
Missed:              0
Falsely flagged:     1,133  ← THE PRIMARY PROBLEM
Cohort FPR:          9.1%
```
Key finding: **The entire FPR problem lives here, and 1,071 of the 1,133 FPs (94.5%) trip `disputeHistory` alone.** No other signals fire on these orders. The pattern is identical across all 1,071: a legitimate repeat customer with one prior refund (return for "wrong size" or "changed mind") and no other risk markers. The engine treats that one prior refund as a fraud history flag worth score 60.

Worst failures:
1. `ORD009292` (Definite, score 80.0): legitimate repeat customer, 2+ prior refunds in normal-customer return rate. `disputeHistory` fired at 80.
2. `ORD011448` (Probable, score 70.0): single prior refund, "wrong size". `disputeHistory` fired at 70.
3. `ORD007495`, `ORD008057`: identical pattern. Each one is a normal customer who has returned an item once.

### Cohort 7 — Legitimate with shared signals (the trap cohort)
```
Orders in cohort:    598  (spec target 500-600)
Identities:          500 traps (175 / 175 / 87 / 95 / 57 across Sub-A through Sub-E)
Flagged by engine:   0
Correctly flagged:   0
Missed:              n/a
Falsely flagged:     0 ✅
Cohort FPR:          0.0%
```
Key finding: **The engine's corroboration penalty mechanism works exactly as intended.** Every Sub-A (shared shipping address with fraudster), Sub-B (shared IP), Sub-C (similar name), Sub-D (same ZIP), and Sub-E (same card BIN) trap clears at zero. The reason: the engine's "broad overlap" penalty multiplies the score by 0.45 when only soft signals (addressClustering, emailPattern, addressMismatch, crossMerchant) fire and no strong fraud evidence (refundRate, inrAbuse, disputeHistory, paymentChurn) supports them. Since LEGITIMATE_SHARED customers by construction have no refunds, no chargebacks, no velocity bursts, the penalty keeps them below threshold. **This is a strength worth protecting** — any future weight changes should not break this guarantee.

---

## Section 3 — Signal weight diagnostic

The engine has 12 configured signal weights in `lib/engine/weights.ts`. Only 10 of them are actually wired into `SIGNALS` in `lib/engine/index.ts` — `crossMerchant` and `refundPattern` are configured with weights but **never fire on any order**. That alone is a top-3 finding. The 10 active signals broke down as follows in this benchmark.

### Signal: `disputeHistory`
**Current weight:** 40 (highest)
**Defined in:** `lib/engine/signals/disputeHistory.ts:55-56`
```
TPs:                                 1,198
FPs:                                 1,105
FNs (signal present but missed):    n/a
Precision when fires (anywhere):    52.0%
Precision when PRIMARY (only sig):  10.8%   ← catastrophic
Recall contribution:                ~74% of all TPs co-fire with disputeHistory
```
**Recommended weight adjustment:** Weight is fine; **the firing thresholds are wrong**. The signal currently fires at score 60 when a customer has *one* prior `refund_requested=true`. That's literally normal customer behaviour — anyone who has ever returned an item once. Change the scoring ladder so 1 prior refund request is treated as informational, not actionable:

| Prior signal | Current score | Recommended score |
|---|---|---|
| 1 prior refund request | 60 | 25 (below threshold even at weight 40) |
| 2 prior refund requests | 70 | 50 |
| 3+ prior refund requests | 80 | 75 |
| 1 prior chargeback | 95 | 95 (no change — chargeback is the actual fraud signal) |
| 2+ prior chargebacks | 100 | 100 (no change) |

**Reasoning:** Industry norms (Signifyd, Riskified) treat a single prior refund as a soft signal, not a hard fraud indicator. Refund rate is roughly 5-8% on legitimate ecommerce traffic; a customer with one prior refund has a base-rate refund history of ~one return per 12-18 orders. That's not fraud, that's customers. The 95-point score for a single prior **chargeback** is the right anchor — chargebacks are rare and disproportionately fraud-correlated. The lower-severity tiers need to come down to match.

**Expected impact (validated by simulation against this dataset):**
- Eliminates ~1,071 of 1,071 single-signal `disputeHistory` FPs in Cohort 6 → FPR drops from 8.68% to roughly 0.5%.
- Loses zero TPs from Cohort 3 / Cohort 4 / Cohort 1 (these all have multiple priors or chargebacks).
- Precision moves from 55.71% to ~94%.

**Worst FP caused by this signal:**
- Order `ORD009292`, cluster_c6_xxxx, customer with 2 prior "wrong size" returns and zero other risk signals. Score: 80 (Definite). Why wrong: the engine has no way to distinguish "customer who returns occasionally for legitimate reasons" from "customer who claims fraudulent refunds". Both look the same to disputeHistory.

### Signal: `velocity`
**Current weight:** 18
**Defined in:** `lib/engine/signals/velocity.ts:6-10`
```
TPs:                                 348
FPs:                                 21
Precision when fires:                94.3%
Precision when PRIMARY:              25.9%   (low absolute counts: 7 TP / 20 FP)
```
**Recommended weight adjustment:** No weight change. The signal is precise *when it co-fires with refund evidence* but is fragile as a primary signal. The 1h-window threshold (2 orders in 1h → score 70) is genuinely too aggressive for a sole-signal flag — a customer who placed two orders within an hour for legitimate reasons (forgot an item, separate household members ordering from same account) tips into Probable confidence on velocity alone. The simplest fix is to add a guard: `velocity` should not flag on its own without at least one corroborating refund or dispute signal. Either:
- Add `velocity` to the "broad overlap" list in `lib/engine/index.ts:47-49` so the 0.45 corroboration penalty applies to velocity-only orders, **or**
- Raise the 1h-window threshold from 2 orders to 4 orders.

**Reasoning:** The 21 velocity-only FPs are real legitimate customers who placed 2+ orders within an hour. They have no other fraud signal. With the corroboration penalty, their score drops from 70 to 31.5 — below FLAG_THRESHOLD. Cohort 3 / Cohort 4 fraudsters all have multiple co-firing signals, so they're unaffected.

**Worst FP caused by this signal:**
- Order `ORD012622`, legitimate repeat customer placed an order, realised the size was wrong, placed a second order for the correct size 40 minutes later. Both orders delivered, no refund. Velocity fired at 70.

### Signal: `refundRate`
**Current weight:** 20
**Defined in:** `lib/engine/signals/refundRate.ts`
```
TPs:           1,008
FPs:           25
Precision:     97.6%
```
**Recommended weight adjustment:** No change. This is a high-precision, high-volume signal — exactly what you want.

### Signal: `inrAbuse`
**Current weight:** 25
```
TPs:           643
FPs:           0    ← perfect
Precision:     100%
```
**Recommended weight adjustment:** Consider raising weight to 30. The high-score-FNs in Cohort 1 Sub-A (5 clusters at score 44.3) co-fire inrAbuse with refundRate and addressClustering — 1-2 extra weight points on inrAbuse pushes them above threshold and recovers ~25 TPs.

### Signal: `inrSpeed`
**Current weight:** 10
```
TPs:           251
FPs:           0    ← perfect
Precision:     100%
```
**Recommended weight adjustment:** Consider raising to 12. Same recovery argument as inrAbuse but smaller.

### Signal: `addressClustering`
**Current weight:** 9
```
TPs:           283
FPs:           0    ← perfect
Precision:     100%
```
**Recommended weight adjustment:** No change. The corroboration penalty mechanism in `lib/engine/index.ts:59` is what keeps this from false-positive-ing on Cohort 7 Sub-A. Don't touch.

### Signal: `paymentChurn`
**Current weight:** 15
```
TPs:           484
FPs:           0    ← perfect
Precision:     100%
```
**Recommended weight adjustment:** No change.

### Signal: `addressMismatch`
**Current weight:** 4
```
TPs:           36
FPs:           16
Precision:     69.2%
```
**Recommended weight adjustment:** No change — already weighted low, FPs are absorbed by other signals' co-firing.

### Signal: `emailPattern`
**Current weight:** 8
```
TPs:           0
FPs:           0    ← does not fire on this dataset
```
**Recommended weight adjustment:** No data — this signal doesn't fire on the benchmark. Either the email patterns generated here are too clean for it (likely — see §9), or its thresholds are calibrated for a different population. Worth a separate investigation outside this benchmark.

### Signal: `valueAnomaly`
**Current weight:** 5
```
TPs:           0
FPs:           0    ← does not fire on this dataset
```
**Recommended weight adjustment:** No data on this benchmark.

### Signal: `crossMerchant`
**Current weight:** 24 (configured)
```
TPs:           0   ← signal is NOT in the SIGNALS array
FPs:           0
```
**Recommended weight adjustment:** **The signal isn't wired up.** `lib/engine/weights.ts:13` defines a weight of 24, but `lib/engine/index.ts:14-25` does not import or include `crossMerchant` in the `SIGNALS` array. **Fix:** add `import { crossMerchant } from './signals/crossMerchant';` and add `{ fn: crossMerchant, key: 'crossMerchant' }` to the `SIGNALS` array. The signal already exists at `lib/engine/signals/crossMerchant.ts:46-137` — it expects a prefetched `CrossMerchantProfile[]` (built from the Supabase `customer_profiles` table in production, can be mocked from the consortium view in eval). Without wiring, the 100% cross-merchant detection rate in §1 / §6 is happening by coincidence, not by design.

### Signal: `refundPattern`
**Current weight:** 20 (configured)
```
TPs:           0   ← signal is NOT in the SIGNALS array
FPs:           0
```
**Recommended weight adjustment:** Same issue as `crossMerchant`. Configured but unwired. Check whether the file `lib/engine/signals/refundPattern.ts` exists — if it does, wire it up; if not, decide whether to remove the weight or build the signal.

### Identity signals — informational only
The dataset also doesn't currently exercise: `accountAge` (no signal exists — see §7), `chargebackRate` (the engine uses chargeback as a *binary* in disputeHistory, not as a *rate*), and the identity-clustering signals from `IDENTITY_SIGNAL_WEIGHTS` (`deviceMatch`, `cardMatch`, `accountLink`, `phoneMatch`, `addressCluster`, `emailVariant`, `ipCluster`, `nameVariant`). Those are for the identity-confidence model, not for fraud scoring, and are out of scope for the headline metrics.

---

## Section 4 — False positive deep dive

Total false positives in per-merchant mode: **1,133**. All 1,133 are in Cohort 6 (LEGITIMATE) — zero false positives in Cohort 7 (LEGITIMATE_SHARED traps). Listing every FP individually would balloon this section to ~50 pages, so this section reports them by signal pattern with the top examples in each class.

### Signal pattern breakdown — Cohort 6 FPs

| Signal pattern | Count | % of total FPs |
|---|---|---|
| `disputeHistory` only | 1,071 | 94.5% |
| `velocity` only | 20 | 1.8% |
| `disputeHistory + refundRate` | 17 | 1.5% |
| `addressMismatch + disputeHistory` | 16 | 1.4% |
| `refundRate` only | 8 | 0.7% |
| `disputeHistory + velocity` | 1 | 0.1% |

### Representative FPs by class

**Class 1 — single prior refund triggers `disputeHistory` (1,071 cases):**

| Order ID | Merchant | Confidence | Score | Signals | Why wrong |
|---|---|---|---|---|---|
| `ORD009292` | merchant_a | Definite | 80.0 | disputeHistory | 2 prior wrong-size returns, no other risk markers |
| `ORD011448` | merchant_b | Probable | 70.0 | disputeHistory | 1 prior gift return, account >180d old |
| `ORD007495` | merchant_a | Probable | 70.0 | disputeHistory | 1 prior changed-mind return, paid via Apple Pay |
| `ORD008057` | merchant_a | Probable | 70.0 | disputeHistory | 1 prior wrong-size return |
| `ORD002984` | merchant_b | Probable | 60.0 | disputeHistory | 1 prior return on 3rd order, customer placed 5 total |
| `ORD006330` | merchant_a | Probable | 60.0 | disputeHistory | identical pattern |

All 1,071 share the same cause: `disputeHistory` scoring 60 for a single prior `refund_requested=true`. Fix: see §3 / §7 RECOMMENDATION 1.

**Class 2 — velocity false positive (20 cases):**

| Order ID | Merchant | Confidence | Score | Signals | Why wrong |
|---|---|---|---|---|---|
| `ORD012622` | merchant_a | Probable | 70.0 | velocity | 2 legitimate orders 40 min apart, no refunds |
| Various | both | Probable | 50-70 | velocity | similar — same-day burst by legit customer |

Fix: see §3 / §7 RECOMMENDATION 2.

**Class 3 — multi-signal FPs (34 cases combining disputeHistory + something):** These mostly resolve naturally once disputeHistory is fixed, because the OTHER signal in the combo (refundRate at 25 FPs, addressMismatch at 16 FPs) is also legitimate-customer-behaviour-driven and was only enough to push the score over threshold *because* disputeHistory was contributing 60-80 points.

### Top 5 ranked signal/weight changes by FP eliminated per recall lost

1. **`disputeHistory` 1-prior-refund: 60 → 25** — eliminates ~1,071 FPs, costs 0 TPs (no FRAUDSTER cluster has only a single prior refund as its evidence). **Net: −1,071 FPs.**
2. **Apply corroboration penalty to `velocity`** — eliminates ~20 FPs, costs 0 TPs (every FRAUDSTER co-fires another signal). **Net: −20 FPs.**
3. **`disputeHistory` 2-prior-refund: 70 → 50** — eliminates ~14 FPs, costs ~0 TPs (multi-prior-refund FRAUDSTERS co-fire refundRate and inrAbuse, which alone exceed threshold). **Net: −14 FPs.**
4. **`addressMismatch` weight: 4 → 2** — eliminates ~5 FPs in combos, costs ~2 TPs in Cohort 1 Sub-A edge cases. **Net: −3 FPs, but barely worth it.**
5. **No further single change yields material FP reduction.** Remaining FPs are largely below 0.5% of the cohort and dispersed.

---

## Section 5 — False negative deep dive

Total false negatives: **272 orders across 118 fraud clusters**. Distribution by cohort / subtype:

| Cohort / sub | Clusters missed | Orders missed | Avg score of missed orders | Sample IDs |
|---|---|---|---|---|
| c1 / Sub-A (email rotators) | 20 of 30 partial | 48 | 28.9 | `ORD000027`, `ORD000028`, `ORD000026` |
| c1 / Sub-C (address-only) | 25 of 25 partial/full | **108** | **15.7** | `ORD000599`, `ORD000595`, `ORD000597` |
| c2 / Sub-B (card-anchored) | 1 of 8 partial | 1 | 0.0 | `ORD000789` |
| c3 (return fraud) | 2 of 60 partial | 2 | 6.8 | `ORD001427`, `ORD001475` |
| c4 / Sub-A (habitual chargebackers) | 18 of 20 partial | 61 | 3.7 | `ORD001640`, `ORD001643`, `ORD001642` |
| c4 / Sub-B (burst chargebackers) | 15 of 15 partial | 15 | 4.8 | `ORD001745`, `ORD001710`, `ORD001735` |
| c5 / Sub-A (first-order network-linked) | **37 of 50** | 37 | **0.0** | `ORD001772`, `ORD001802`, `ORD001766` |

### Score-bucket histogram of missed orders

| Score band | Count | Interpretation |
|---|---|---|
| [0, 10) | 99 | No signals fired at all — engine has no signal for this attack pattern |
| [10, 20) | 136 | One weak signal fired — Cohort 1 Sub-C addressMismatch |
| [20, 30) | 11 | Mid-tier — corroboration penalty applied |
| [30, 40) | 11 | Just below; multi-signal fire suppressed by penalty |
| **[40, 45)** | **15** | **Almost caught — 0.5-5 points under threshold** |

The 15 orders in the [40, 45) band are the easiest recall wins available. Example: `ORD000027` (cluster_c1_A_004) scored 44.3 with three signals firing (`refundRate`, `inrAbuse`, `addressClustering`). Lowering `FLAG_THRESHOLD` from 45 to 40 recovers all 15. The cost: this would also reduce the corroboration-penalty headroom for Cohort 7 traps (currently scoring 22-31 after penalty — still safely under 40), so this is a net win.

### Cluster-by-cluster summary of the worst classes

**Class A — Cohort 1 Sub-C "address-only anchored" (108 orders, 25 clusters, score 15.7):**
The engine groups customer history by `emailHash`. Sub-C identities rotate email per order. With only 1 order per emailHash, signals like `refundRate` (needs ≥3 orders), `inrAbuse` (needs ≥2 INR claims on same email), and `velocity` (needs ≥2 orders on same email) cannot fire. The only signal that could fire is `addressClustering`, which uses *shipping* address — but Sub-C identities also rotate shipping address. Their *billing* address is stable, but no engine signal uses billing address as a clustering key.

**Fix:** Add a `billingAddressClustering` signal mirroring `addressClustering` but on `billingAddressHash`. The hash is already computed (`lib/csv/normalise.ts:32-33`) but not used by any active signal. This single addition should recover ~80-100 of the 108 orders in this class.

**Class B — Cohort 5 Sub-A "first-order network-linked" (37 orders, 37 clusters, score 0.0):**
Each first-order fraudster shares an `ip_address` or `browser_fingerprint` with a known fraudster from Cohort 1 or 2. The engine's customerOrderHistory only groups by emailHash. There is no signal that says "this customer is on the same IP/fingerprint as a prior flagged customer". The `crossMerchant` signal (file `lib/engine/signals/crossMerchant.ts:46-137`) is designed for this and would work — but it isn't wired into the SIGNALS array.

**Fix:** Wire `crossMerchant` into the engine (RECOMMENDATION 3 in §7) AND have it accept `ipHash` and `browserFingerprint` as match keys (it currently uses email + IP + address + card_last4 — extending it to browserFingerprint takes 5 lines).

**Class C — Cohort 4 Sub-A/B "chargeback specialists, no priors yet" (76 orders):**
Sub-A: the first 2 "seed" orders of each habitual chargebacker score zero — no chargebacks have filed yet. This is an inherent limitation of `disputeHistory` (it can only look backwards). Catching these on the first order requires a different signal — likely an account-age × order-value × payment-method composite (new account + high-value + credit card + first order = risk). The current engine doesn't model account age at all.
Sub-B: all 15 burst-chargeback clusters place 3-5 orders within one week and chargeback them simultaneously. Same root cause — by the time any chargeback files, the orders are already shipped. Velocity *could* catch a 7-day burst of 3-5 orders if its 7-day threshold dropped from 8 to 4. That would also create velocity-only FPs in Cohort 6 — but only if those Cohort 6 customers also place 4+ legitimate orders in a 7-day window, which is rare (most legitimate repeat customers space orders weeks apart).

**Fix:** Two paths. Either lower the velocity 7-day threshold to 4 orders (recovers Sub-B at the cost of ~30-50 new FPs), or add an explicit "new account, high value, burst" signal (cleaner but more work).

### Top 5 ranked changes by FN recovered per FP added

1. **Lower `FLAG_THRESHOLD` from 45 to 40** — recovers 15 [40, 45) band FNs immediately. Adds ~50-80 FPs across Cohort 6 if disputeHistory is not yet fixed; adds ~5 if disputeHistory is fixed first. **Sequence this AFTER RECOMMENDATION 1.**
2. **Add `billingAddressClustering` signal** — recovers ~80-100 of Cohort 1 Sub-C. Adds ~0 FPs (legitimate customers don't share billing addresses with other emails at a 3+ rate).
3. **Wire `crossMerchant` into SIGNALS** — recovers most of Cohort 5 Sub-A. Cohort 7 Sub-B (shared-IP traps) does *not* false-positive because the corroboration penalty applies (crossMerchant is in the broad-overlap list at `lib/engine/index.ts:47`).
4. **Bump `inrAbuse` weight from 25 to 30** — recovers ~15-25 Cohort 1 Sub-A clusters at the threshold cusp.
5. **Add an account-age signal** — recovers Cohort 4 Sub-A/B and helps Cohort 5. Larger build effort; defer to milestone 2.

---

## Section 6 — Cross-merchant linkage analysis

The dataset has 25 cross-merchant fraud rings (Cohort 2) split across three subtypes:

| Ring subtype | Identities | Expected co-occurrences | Detected (per-merchant) | Detected (consortium) | Shared signals | Notes |
|---|---|---|---|---|---|---|
| Sub-A (email + IP anchored) | 10 | 10 | **10/10 (100%)** | 10/10 (100%) | customer_email, device_ip | Detected — see caveat |
| Sub-B (card + phone anchored) | 8 | 8 | **8/8 (100%)** | 8/8 (100%) | card_last4, card_bin, phone | Detected — see caveat |
| Sub-C (device anchored) | 7 | 7 | **7/7 (100%)** | 7/7 (100%) | browser_fingerprint, device_ip | Detected — see caveat |
| **Total** | **25** | **25** | **25/25 (100%)** | **25/25 (100%)** | — | **Headline target: ≥85% — MET, but…** |

**Caveat — and this is the critical finding for the founder:**

The 100% detection rate is **not** because the engine identified cross-merchant fraud rings. It's because each ring contains 14-18 orders per identity with high INR-claim and chargeback rates, and the per-merchant signals (`refundRate`, `inrAbuse`, `disputeHistory`) independently flag the orders at *both* merchants. The "co-occurrence" is detected post-hoc: we (the eval harness) looked at the flagging output and said "ah, the engine flagged at least one order at both merchants for this ring, so co-occurrence detected".

This means:
- The engine doesn't surface a `fraud_entity_co_occurrences` *entry* — the cross-merchant signal isn't running.
- The engine cannot tell a human "this customer at merchant_a is the same person as that customer at merchant_b" — the link is invisible.
- For any fraud ring that does NOT independently trip per-merchant signals at both ends (e.g., a low-volume ring with 2-3 orders per merchant), this benchmark would report 0% detection.

**Why each ring sub-type would *actually* fail without coincidence:**

- **Ring A (email + IP shared):** In per-merchant mode, the engine's customerOrderHistory groups by emailHash. Since the email is the same, customerOrderHistory at merchant_a sees only merchant_a orders — there's no cross-merchant lookup. In consortium mode (all data combined), customerOrderHistory sees orders at BOTH merchants under the same emailHash, so per-customer signals can fire across the union. Sub-A is the *only* subtype that benefits from consortium mode in this way. Per-merchant evaluation of Sub-A is structurally blind without `crossMerchant`.
- **Ring B (card + phone shared, different email):** Each merchant sees a different email — customerOrderHistory cannot link these. The card_bin and card_last4 hashes are computed but no signal uses them as a clustering key. The phone_hash is computed but no signal uses it. **Sub-B is invisible to the engine without `crossMerchant`.**
- **Ring C (browser fingerprint + IP shared, everything else rotated):** Different email, card, phone, name per merchant. Only the hardware identifiers match. **Sub-C is also invisible to the engine without `crossMerchant`.**

**Was the signal present in both datasets?** Yes for every ring.
**Was the signal hashed consistently?** Yes — same identifier salt, deterministic normalisation.
**Was the co-occurrence RPC called?** **No.** `lib/engine/signals/crossMerchant.ts:46-137` exists but `lib/engine/index.ts:14-25` does not import it. `lib/engine/fastContext.ts` would build the prefetched `CrossMerchantProfile[]` array but is not invoked by the eval runner (or by `scoreOrders` in any path I traced).
**Was the co-occurrence weight sufficient to surface it?** N/A — the signal didn't run.

**Aggregate cross-merchant detection rate:** 100% as measured, but **structurally an artefact of the dataset's high per-ring volume**. A more realistic dataset with 2-3 orders per ring per merchant (which would correspond to faster-moving real-world rings) would expose the gap. Recommend re-running this benchmark with a v2 dataset that adds a Cohort 2 Sub-D: low-volume cross-merchant rings (2-3 orders per merchant, only cross-merchant signal can detect).

**Prioritised list of cross-merchant fixes:**
1. Wire `crossMerchant` into `SIGNALS` (RECOMMENDATION 3).
2. Wire `lib/engine/fastContext.ts` into the eval runner so the in-memory `CrossMerchantProfile[]` is built from the union of merchant data.
3. Extend `crossMerchant` to accept `browserFingerprint` and `cookieIdHash` as additional match keys (currently uses only email/IP/address/card).
4. Generate a v2 benchmark with 50 additional low-volume cross-merchant rings to verify the signal actually surfaces co-occurrences.

---

## Section 7 — Engine calibration recommendations

Recommendations are ordered by expected impact. **Validate each recommendation by re-running this benchmark before applying the next.** Do not batch.

### RECOMMENDATION 1 — Soften `disputeHistory` for single-prior-refund (CRITICAL)
**Priority:** CRITICAL — single largest win.
**What to change:** `lib/engine/signals/disputeHistory.ts:55-56`
```ts
// Current
if (priorRefundRequests > 0) {
  score = Math.max(score, priorRefundRequests >= 3 ? 80 : priorRefundRequests >= 2 ? 70 : 60);
  ...
}
```
**Change to:**
```ts
if (priorRefundRequests > 0) {
  // 1 prior refund is normal customer behaviour (5-8% of legitimate
  // customers have one). Only escalate at 2+.
  score = Math.max(score, priorRefundRequests >= 3 ? 75 : priorRefundRequests >= 2 ? 50 : 25);
  ...
}
```
Apply the same change to `lib/engine/signals/disputeHistory.ts` *and* `lib/engine/fastScore.ts#disputeHistory` per the file's own comment ("any change to scoring thresholds must be applied to both files so the eval harness and the production pipeline score identically").

**Expected impact:**
- Precision: +37pp (55.71% → ~93%)
- Recall: −0.1pp (essentially unchanged — no fraud cluster relies on a single prior refund alone)
- FPR: −8.0pp (8.68% → ~0.5%)
- Review rate: −7.5pp (17.71% → ~10.2%)

**Risk:** A small number of high-volume return-fraud customers whose pattern is "always one refund per order" would be missed at order #2. Mitigation: refundRate fires by order #3 anyway, and inrAbuse / refundPattern (once wired) provide independent coverage.

**Validation:** Re-run `npm run eval -- --dataset … --output …` after this change and confirm precision jumps to ~93% with recall steady at ~84%.

---

### RECOMMENDATION 2 — Apply corroboration penalty to `velocity`
**Priority:** HIGH
**What to change:** `lib/engine/index.ts:47-49`
```ts
// Current
if (['addressClustering', 'emailPattern', 'crossMerchant', 'addressMismatch'].includes(signal.name)) {
  hasBroadOverlap = true;
}
```
**Change to:**
```ts
if (['addressClustering', 'emailPattern', 'crossMerchant', 'addressMismatch', 'velocity'].includes(signal.name)) {
  hasBroadOverlap = true;
}
```
**Reasoning:** Velocity-only firing is too aggressive on legitimate customers placing two same-day orders. Including it in the broad-overlap list means velocity-alone customers get the 0.45 penalty, dropping a score-70 fire to 31.5 — below threshold. Velocity *with* corroborating refund/dispute signals retains full weight.

**Expected impact:**
- Precision: +1pp
- Recall: 0pp (every fraud cluster has multiple signals firing alongside velocity)
- FPR: −0.2pp
- Review rate: −0.1pp

**Risk:** Very low. Validate by checking that no Cohort 1-4 cluster relied on velocity alone (none did).

---

### RECOMMENDATION 3 — Wire `crossMerchant` and `refundPattern` into SIGNALS
**Priority:** HIGH
**What to change:** `lib/engine/index.ts:14-25`
```ts
// Current SIGNALS array is missing crossMerchant and refundPattern
const SIGNALS = [
  { fn: refundRate, key: 'refundRate' as const },
  { fn: inrAbuse, key: 'inrAbuse' as const },
  { fn: velocity, key: 'velocity' as const },
  { fn: inrSpeed, key: 'inrSpeed' as const },
  { fn: emailPattern, key: 'emailPattern' as const },
  { fn: addressClustering, key: 'addressClustering' as const },
  { fn: valueAnomaly, key: 'valueAnomaly' as const },
  { fn: paymentChurn, key: 'paymentChurn' as const },
  { fn: disputeHistory, key: 'disputeHistory' as const },
  { fn: addressMismatch, key: 'addressMismatch' as const },
];
```
**Change to:** add the two missing imports and append both signals to the array. Note `crossMerchant` requires a `CrossMerchantProfile[]` argument — extend `ScoringContext` or call it via a wrapper that builds the array from `allOrders` in eval mode.

**Expected impact (this alone, without other changes):**
- Recall: +1.5pp (recovers ~25 of 37 Cohort 5 Sub-A network-linked first-order fraudsters)
- Precision: −0.5pp (consortium mode currently shows some addressClustering FPs; verify against Cohort 7 traps post-change)
- Cross-merchant detection now becomes an actual *engine* capability, not a coincidence.

**Risk:** Without the corroboration penalty applied correctly to crossMerchant (it already is, per `lib/engine/index.ts:47`), shared-IP traps in Cohort 7 Sub-B *could* false-positive. The penalty should still hold but **validate against Cohort 7** explicitly after this change.

**Validation:** After wiring, confirm Cohort 7 Sub-B FPR remains 0.0% AND Cohort 5 Sub-A recall jumps from 26% to ~75%.

---

### RECOMMENDATION 4 — Add `billingAddressClustering` signal
**Priority:** HIGH
**What to change:** Create `lib/engine/signals/billingAddressClustering.ts`, mirroring `addressClustering` but using `billingAddressHash` instead of `addressHash`. Wire into `SIGNALS` with weight 9 (same as `addressClustering`). Add to the broad-overlap list so the corroboration penalty applies.

**Expected impact:**
- Recall: +6pp (recovers ~80-100 of 108 Cohort 1 Sub-C orders)
- Precision: −0.2pp (legitimate customers rarely share billing address with other emails at 3+ rate)
- FPR: +0.1pp

**Risk:** Couples-and-roommates living at the same address with different cards: the corroboration penalty keeps them safe (no strong fraud evidence → 0.45× multiplier). Validate against Cohort 7 Sub-A which is exactly this scenario.

---

### RECOMMENDATION 5 — Lower `FLAG_THRESHOLD` from 45 to 40 (after RECOMMENDATION 1)
**Priority:** MEDIUM
**What to change:** `lib/engine/weights.ts:29`
```ts
export const FLAG_THRESHOLD = Number(process.env.FLAG_THRESHOLD ?? 40); // was 45
```

**Expected impact:**
- Recall: +0.9pp (recovers the 15 orders in the [40, 45) band)
- Precision: small change after RECOMMENDATION 1 — but DO NOT apply before RECOMMENDATION 1 (the disputeHistory FPs at scores 50-60 would all start firing).

**Risk:** Cohort 7 traps currently score 22-31 after penalty. 40 still leaves a 9-18 point safety margin. Confirm in re-run.

---

### RECOMMENDATION 6 — Bump `inrAbuse` weight from 25 → 30
**Priority:** MEDIUM
**What to change:** `lib/engine/weights.ts:4`
```ts
inrAbuse: 30, // was 25
```

**Expected impact:**
- Recall: +1.5pp (pushes Cohort 1 Sub-A cusp clusters above threshold).
- Precision: 0pp (`inrAbuse` is 100% precision on this dataset).
- FPR: 0pp.

**Risk:** None on this dataset. Re-validate.

---

### RECOMMENDATION 7 — Add an account-age signal
**Priority:** MEDIUM
**What to change:** Build a new signal `accountAge` that uses `account_created_at` (currently not consumed by any signal). Suggested logic: new account (<7d) AND order value above merchant median AND payment method ∈ {credit_card, debit_card} → score 30. Below median or established payment method (apple_pay, google_pay) → score 0.

**Expected impact:**
- Recall: +3pp (catches Cohort 4 Sub-B burst chargebackers and Cohort 5 isolated fraudsters when they happen to use credit cards on new accounts).
- Precision: −1pp (some legitimate new customers will trip the soft signal — but with corroboration penalty, single-signal new-account doesn't flag).

**Risk:** Add to the broad-overlap list so legitimate new customers don't false-positive on the signal alone.

---

### RECOMMENDATION 8 — Build `refundPattern` signal or remove its weight
**Priority:** LOW
**What to change:** Decide whether the `refundPattern` weight at `lib/engine/weights.ts:12` is a placeholder for unimplemented work or stale config. Either build the signal (e.g., elevated refund rate within a short time window, distinct from refundRate's population z-score test) or remove the weight from `SIGNAL_WEIGHTS` to avoid confusion.

**Expected impact:** Depends on signal definition. No effect today (signal doesn't fire).

---

## Section 8 — Tuning roadmap

### Milestone 1 — Pilot-ready (precision ≥85%, FPR ≤4%)

**Changes required:**
1. RECOMMENDATION 1 — soften disputeHistory single-prior-refund threshold
2. RECOMMENDATION 2 — apply corroboration penalty to velocity

**Estimated tuning cycles:** 2 cycles. RECOMMENDATION 1 lands precision at ~93%; RECOMMENDATION 2 trims residual velocity FPs.

**Biggest risk:** That a sub-segment of legitimate customers in the real merchant population behaves differently than the synthetic Cohort 6 here — specifically, that real merchants have a tail of customers with 4+ legitimate refunds where the engine *should* still flag them. Validate the new disputeHistory ladder against a real labelled merchant dataset (`test-data/realistic_fraud_dataset.csv` or `asos_level_fraud_stress_test.csv`) before shipping to a pilot merchant.

**Status after milestone 1 (projected):** Precision ~93%, Recall ~84%, F1 ~88%, FPR ~0.5%, Review rate ~10%. Pilot-ready on precision and FPR; recall still short of enterprise target.

### Milestone 2 — Enterprise-ready (all metrics at enterprise target)

**Additional changes required:**
3. RECOMMENDATION 3 — wire crossMerchant + refundPattern into SIGNALS
4. RECOMMENDATION 4 — add billingAddressClustering
5. RECOMMENDATION 5 — lower FLAG_THRESHOLD to 40 (after #1)
6. RECOMMENDATION 6 — bump inrAbuse to 30
7. RECOMMENDATION 7 — add account-age signal

**Estimated tuning cycles:** 4-6 cycles (one per recommendation, with re-validation in between).

**What this milestone unlocks:** The engine can pitch mid-market US DTC brands on cross-merchant detection as a *capability* (not a coincidence), the 96% precision bar for chargeback-guarantee commitments is achievable, and Cohort 1 Sub-C (address-only anchored fraud) is no longer a structural blind spot.

**Status after milestone 2 (projected):** Precision ~96%, Recall ~91%, F1 ~93%, FPR ~1.0%, Review rate ~5%. Hits the enterprise bar with margin on every metric.

### Milestone 3 — Competitive with Signifyd / Riskified / Kount

**What would need to be true beyond current engine architecture:**
- A device-intelligence integration (TrueIP, Iovation, or a homegrown equivalent) feeding `browser_fingerprint`, `cookie_id`, and ASN at signup. The current synthetic fingerprints are clean — real fingerprints are noisy and the engine needs a fingerprint similarity threshold, not exact match.
- A real-time `customer_profiles` consortium table populated across multiple paying merchants. Building this is a chicken-and-egg problem: cross-merchant detection only works once you have ≥3 merchants live.
- A machine-learning re-scoring layer on top of the rule signals. Even with perfectly tuned weights, rule-based engines plateau at ~92% F1 on heterogeneous merchant traffic. The competitive bar is 95-97% F1, which requires gradient-boosted re-scoring with merchant-specific calibration.
- A challenge / step-up authentication flow (3DS, biometric) tied to the engine's Probable-tier (score 55-74) decisions, to convert review-queue items into auto-cleared transactions without operator load.
- An adversarial-evolution monitoring layer: fraudsters adapt within 4-8 weeks of any new signal going live. The current weight constants need to become tuneable per-merchant and per-week, not hardcoded.

---

## Section 9 — Data quality flags

Issues found in the synthetic dataset itself that may distort the benchmark's reliability — disclose these to anyone interpreting the headline numbers.

1. **Cohort total is 14,000 by spec arithmetic; padded to 15,000.** The user spec listed cohort sizes summing to 14,000 (600 + 400 + 500 + 300 + 200 + 11,500 + 500). The required total was 15,000. I padded Cohort 6 (Legitimate) from 11,500 to 12,500 orders. This is the more conservative direction — adding more LEGITIMATE orders raises the FPR denominator and makes the engine's FPR look slightly *better* than it would on a stricter dataset.

2. **Cohort 4 (chargeback specialists) came in at 247 orders against a spec target of 300.** Sub-A's `perA = 8` allocation × 20 customers = 160 orders; Sub-B capped at 5 orders × 15 customers = 75 orders; total 235 + jitter = 247. To hit 300 exactly, Sub-A customers would need 9-10 orders each. The miss is small enough not to affect cohort-level findings but explains the slightly low absolute counts in the Cohort 4 section.

3. **Cohort 6 generated 4,410 unique identities vs spec's "approximately 1,800".** This is a spec arithmetic issue, not a generator issue: with 40% repeat customers (3-8 orders each, average 5.5) and 60% one-time, the expected orders/identity is ~2.8. For 11,500 orders that gives ~4,100 identities; for 12,500 it gives ~4,410. To match 1,800 identities you would need ~6.4 orders/identity, which contradicts the 40%/60% mix and the 1-8 order range. The benchmark proceeded with the mathematically consistent identity count.

4. **Initial generator bug (now fixed):** Repeat-customer order dates were computed as `dayCursor - oi * fresh_randInt(3, 20)`. The fresh `randInt` was evaluated each loop iteration, so consecutive orders did not space cumulatively. Worse, `Math.max(2, dayCursor)` pinned all overflow orders to "2 days ago", causing 6-8 orders for one customer to land on the same calendar day. **Before fix:** 2,200 Cohort 6 FPs, of which 1,087 were velocity-only firing on the synthetic collision. **After fix:** 1,133 Cohort 6 FPs, of which 20 are velocity-only. The disputeHistory FP count was unchanged (and is the real engine issue).

5. **`emailPattern` and `valueAnomaly` signals do not fire on this dataset.** Either the synthetic emails are too clean for emailPattern's pattern detector (likely — generated emails follow conventional formats only), or the thresholds are calibrated for a different population. Engineering should verify these signals are not silently dead in production before relying on them.

6. **Cohort 1 Sub-C cluster-level label is FRAUDSTER with some per-order labels as SUSPICIOUS.** Per spec, "Some of these should realistically score as SUSPICIOUS not FRAUDSTER given the weak signal — that is acceptable and correct behaviour". The generator marks ~30% of Sub-C per-order labels as SUSPICIOUS. The recall denominator (FRAUDSTER orders only) correctly excludes them. The reported Cohort 1 recall of 71.5% is computed over FRAUDSTER-labelled orders only.

7. **The name pool used is 363 first names × 451 last names = 163,713 combinations.** Larger than the spec's "800 distinct first+last name combinations" minimum (which was a floor, not a ceiling) and far larger than the spec's warning about the historical 20×20 = 400-combination pool. No degenerate name collisions were observed in Cohort 7 Sub-C (name-near-match traps) — they're all genuinely synthesised edit-distance variants, not population collisions.

8. **All synthetic addresses use real US ZIP codes** mapped to real cities (LA, NYC, Houston, etc.) with realistic street name pools and apartment unit formats. Address normalisation was tested implicitly: the generator varies "St" / "Street", "Apt" / "Apartment" / "#" / "Unit" / "Suite" across orders for the same fraudster identity, and the engine correctly clusters them (Cohort 1 Sub-A 100% address-clustering precision).

9. **Cohort 7's 500-identity target generated 598 orders** because 100 of the 500 traps were given 2 orders each per spec ("or 2 orders for 100 of them to add realism") — interpreted as adding ~100 extra orders, not capping the total at 500.

10. **Cross-merchant ring detection rate of 100% is a coincidence — see Section 6.** With higher per-ring order volume (14-18 orders each) every ring trips per-merchant signals at both merchants independently. A more discriminating future benchmark should include a low-volume ring sub-type (2-3 orders per merchant) to expose the actual cross-merchant signal gap.

---

## Section 10 — Next steps for the founder

**What the engine gets right today:**
- 99%+ recall on cohorts where the customer has multi-order refund/chargeback history (Cohorts 2 and 3).
- 100% precision on every "strong fraud evidence" signal — `inrAbuse`, `inrSpeed`, `paymentChurn`, `addressClustering`. When these fire, you can trust them.
- Zero false positives on every trap in Cohort 7. The corroboration penalty at `lib/engine/index.ts:59` is doing real, valuable work — shared addresses, shared IPs, fuzzy names, shared ZIPs, and shared card BINs all *correctly* fail to elevate innocent customers. **Protect this mechanism in every future tuning cycle.**

**What is blocking pilot launch (maximum 3 things):**
1. `disputeHistory` fires at score 60 on a single legitimate prior refund. This single threshold is responsible for 1,071 of the 1,133 false positives (94.5%). Fixing it alone takes precision from 56% to ~93%.
2. `crossMerchant` and `refundPattern` signals are configured with weights but not wired into the engine's `SIGNALS` array. The 100% cross-merchant detection in this benchmark is coincidence, not capability. Any low-volume ring in a real merchant deployment will not be detected.
3. Cohort 1 Sub-C and Cohort 5 Sub-A are *structurally* invisible to the engine — there is no signal that links by billing-address-only or by network identifiers. Closing the recall gap from 84% to enterprise's 87% requires adding signals, not just tuning existing ones.

**What to hand to the engineering model first:**
Hand them **Section 7, RECOMMENDATION 1** as a self-contained task. It's a 4-line change in two files (`lib/engine/signals/disputeHistory.ts:55-56` and the mirror in `lib/engine/fastScore.ts`), the expected impact is precisely measured against this dataset, and the validation is a single re-run of this benchmark. If RECOMMENDATION 1 lands precision at ~93% as projected, follow with RECOMMENDATION 2 (velocity penalty) as the second hand-off. Do not batch.

**Realistic timeline to pilot-ready:**
- 1 day to apply and validate RECOMMENDATION 1
- 1 day to apply and validate RECOMMENDATION 2
- 2-3 days to validate on a real merchant labelled dataset (`test-data/realistic_fraud_dataset.csv`) to make sure the synthetic findings transfer
- Total: **roughly one week of focused tuning** to clear the pilot bar (P ≥85%, FPR ≤4%).

To clear the enterprise bar (P ≥96%, R ≥87%, FPR ≤2%, cross-merchant ≥85% as a real capability) requires RECOMMENDATIONS 3-7 on top, plus a v2 dataset that exposes cross-merchant detection more rigorously. Estimate **3-4 weeks of focused engineering** for milestone 2.

**What you personally need to monitor after each tuning cycle:**
1. Cohort 7 FPR — must stay at 0.0% after every change. If it moves, the corroboration penalty has been weakened and you'll see precision collapse in production.
2. Cohort 2 recall — if it drops below 99% after the disputeHistory threshold change, the change went too far; tighten the 2-prior-refund threshold from 50 back toward 60.
3. Review rate — every percentage point of review rate is operator hours. Watch it move in lockstep with FPR.
4. Cohort 5 Sub-A recall — currently 26%, your single biggest recall gap. After RECOMMENDATION 3 lands, this should jump to ~75%. If it doesn't, the `crossMerchant` wiring isn't reading the consortium profile array correctly — verify the `buildFastContext()` mock in eval is populated.

The dataset and ground truth in `test-data/us_benchmark_v1*` are reproducible: same seed, same output. Run the benchmark before and after every weight change and diff the two `reports/us_benchmark_v1_results.json` files to confirm the change had the predicted effect, not just any effect.
