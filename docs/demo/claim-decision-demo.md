# Claim decision workflow — demo guide

This path demonstrates Unauth’s claim decision loop end to end:

> A helpdesk INR ticket resolves to one claim, merchant rules evaluate claim-specific context, and the same explainable recommendation appears in Gorgias and in-app—with a queryable audit trail.

## Prerequisites

1. `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Migrations applied, including:
   - `20260616100000_merchant_rules.sql`
   - `20260617180000_rule_evaluations_audit_hardening.sql` (audit columns + evidence dedupe index)
3. Local app running (`npm run dev`) for in-app UI checks

## One-command setup

```bash
node scripts/seed-claim-decision-demo.mjs --reset
```

Idempotent re-run (no wipe):

```bash
node scripts/seed-claim-decision-demo.mjs
```

Verify only (after seed):

```bash
node scripts/seed-claim-decision-demo.mjs --verify-only
```

On success, the script writes `scripts/claim-decision-demo-log.json` with live IDs, widget URL, and automated check results.

---

## Login

| Field | Value |
|--------|--------|
| Email | `claim-decision@unauth.app` |
| Password | `UnauthDemo2026!` |
| Merchant | **Unauth Claim Decision Demo** (demo flag) |

---

## Demo scenario (Maya Chen — INR)

| Entity | Value |
|--------|--------|
| Customer email | `maya.demoinr@unauth-demo.test` |
| Gorgias ticket | `GOR-DEMO-INR-9001` |
| Subject | Package never arrived — tracking says delivered |
| Shopify order | `AU-DEMO-008842` (£84.20) |
| Fulfillment | Connected delivery record `TRK884200199` — **delivered** |
| Current claim | Open `item_not_received`, linked to ticket + order |
| Prior claims | 2 resolved INR claims on same identity (denied + refunded) |
| Customer evidence | **None** on current claim |
| Merchant rule | **INR delivered — request evidence** → Manual review |

Stable IDs (deterministic from seed):

| Resource | ID |
|----------|-----|
| Identity (profile) | `5b2bfb57-4131-40e9-b6af-bf9eeb84b209` |
| Current claim | `2893179d-cf36-4226-9373-4948f8fcb42c` |
| Rule | `e322f3e2-0442-4abf-952d-96bf666eaca0` |

---

## Gorgias widget path

**Widget URL** (replace host if not using Vercel preview):

```
/api/gorgias/widget?widget_token=<from log>&email=maya.demoinr@unauth-demo.test&ticket_id=GOR-DEMO-INR-9001&order_number=AU-DEMO-008842
```

Widget token is printed in `scripts/claim-decision-demo-log.json` after seed (prefix `unauth_wt_…`).

### Expected widget behaviour

| Check | Expected |
|-------|----------|
| Claim resolution | Ticket → **one** claim (`single_active_claim_on_ticket`) |
| Recommendation | **Manual review · INR delivered — request evidence** |
| Unavailable states | Must **not** appear (no identity fallback) |
| Identity context | Still visible (orders, claim history, etc.) |
| Deep link | CTA includes `claimId` for same claim in Unauth |

### Rule conditions (plain language)

- Claim type is Item not received
- Delivery status is Delivered
- Prior same-type claims is at least 1 (actual: 2)
- No customer evidence attached

---

## In-app claim review path

**URL:**

```
/customers/5b2bfb57-4131-40e9-b6af-bf9eeb84b209/claims?claimId=2893179d-cf36-4226-9373-4948f8fcb42c
```

Log in as `claim-decision@unauth.app` first.

### Expected in-app behaviour

| Check | Expected |
|-------|----------|
| Recommendation card | Top of action rail — **Manual Review** |
| Rule name | INR delivered — request evidence |
| Matched conditions | Same plain-language bullets as widget |
| Delivery context | Delivered + tracking visible in claim context |
| Evidence | 0 customer evidence; delivery evidence may attach on evaluation |
| Refresh | **Refresh recommendation** re-runs evaluation |
| Stale indicator | Appears after status/evidence/outcome change until refresh |

Widget and in-app must show the **same** recommendation for this claim.

---

## Audit traceability

After evaluation, query `rule_evaluations` for the demo claim:

```sql
SELECT
  claim_id,
  source_ticket_id,
  evaluation_source,
  recommendation,
  dedupe_key,
  signals_hash,
  rules_hash,
  justification_summary,
  matched_conditions
FROM rule_evaluations
WHERE claim_id = '2893179d-cf36-4226-9373-4948f8fcb42c'
ORDER BY evaluated_at DESC
LIMIT 5;
```

### Expected audit behaviour

| Event | Expected |
|-------|----------|
| First evaluation | New row with `evaluation_source` = `gorgias_widget` or `claim_review` |
| Duplicate refresh (same context, &lt;5 min) | `deduped` — no new row |
| Evidence / rule / signal change | New row with different `dedupe_key` |

`justification_summary` should name the rule and matched fields in readable form.

---

## Automated verification (CI / local)

The seed script runs these checks automatically:

1. `resolveClaimForTicketDecision` → `resolved` + correct `claimId`
2. `evaluateClaimDecision` (widget) → `manual_review`
3. In-app evaluation matches widget
4. Audit row has `claim_id`, `source_ticket_id`, hashes
5. Second widget eval dedupes
6. Matched conditions use plain language

Unit tests:

```bash
npm test -- tests/unit/resolveClaim.test.ts tests/unit/ruleAuditDedup.test.ts tests/unit/claimDecision.test.ts tests/unit/rulesEngine.test.ts
npm run typecheck
```

---

## Troubleshooting

### “Claim recommendation unavailable” in widget

- Ticket external ID must be `GOR-DEMO-INR-9001`
- Claim must have `source_ticket_id` pointing at the seeded ticket
- Re-run: `node scripts/seed-claim-decision-demo.mjs --reset`

### Identity fallback recommendation (wrong path)

- Ticket is claim-like; widget should **not** show Approve/Deny from identity rules
- Confirm `inferWidgetTicketClaimLike` returns true and resolution is not `not_found`

### No recommendation / “No rules configured”

- Rule `e322f3e2-0442-4abf-952d-96bf666eaca0` must be `is_active = true` for demo merchant
- Re-run seed with `--reset`

### Recommendation is `no_match`

- Fulfillment must be `delivered` on order `AU-DEMO-008842`
- Current claim must have **no** `customer_message` / `support_ticket` evidence
- Identity must have ≥1 prior INR claim (`merchant_prior_same_type_claim_count` ≥ 1)

### Audit columns missing

- Apply `20260617180000_rule_evaluations_audit_hardening.sql`
- Without it, evaluations still work but `source_ticket_id` / `dedupe_key` may be null

### Widget 401 / helpdesk disconnected

- Seed creates active Gorgias connection for demo merchant
- Use widget token from `claim-decision-demo-log.json`
- Log in to Unauth with demo account so merchant context matches

---

## What this demo proves

1. Gorgias ticket resolves to the exact claim row  
2. Claim-scoped recommendation (not identity fallback)  
3. Recommendation driven by merchant-configured rule  
4. Matched conditions readable by a support lead  
5. Parity between Gorgias widget and in-app review  
6. Delivery / tracking context in evaluation  
7. Refresh / re-evaluation supported in UI  
8. Audit row records what was recommended and why  
9. Duplicate sidebar refreshes do not spam audits  
10. Focused seed—no unrelated product changes  
