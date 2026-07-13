# Unauth Terminology

## Preferred terms

- Support payout case
- Post-purchase loss
- Payout exposure
- Evidence strength
- Evidence missing
- Merchant rule fired
- Recommended action
- Loss attribution
- Recoverability
- Recovery case
- Recovery owner
- Chase due
- Prevention opportunity
- Policy leakage
- Partner accountability
- Customer-disputed delivery
- Strong proof of delivery
- Manual review
- Ask for evidence
- Approve and open recovery

## Avoid

- Fraudster
- Bad actor
- Blacklist
- Guilty
- Caught
- Scammer
- Customer fraud
- Cross-merchant accusation

## Safe framing

Do not say:

> This customer is lying.

Say:

> Delivery evidence is strong. Customer evidence is currently weak. Merchant rule recommends manual review.

Do not say:

> Carrier is to blame.

Say:

> Possible carrier recovery route identified. Evidence required before submission.

Do not say:

> This is fraud.

Say:

> Claim pattern requires review under merchant policy.

---

## Copy dictionary (UI craft overhaul §7)

Binding replacements — never render the left column; render the right.

| Never render | Render instead |
|---|---|
| Canonical loss_cases | Loss records |
| awaiting_carrier_response (any snake_case) | mapped label via `lib/ui/labels.ts` |
| Case Projection / Recovery Projection / Automation (as source) | Payout case / Recovery / Automation rule |
| Server-filtered view · "Results are server filtered and paginated." | (delete) · "Showing 22 items" |
| Executive value bridge and operational attention from canonical merchant records. | What you're owed, what you've recovered, and what needs a decision. |
| One provider contract for capability, account, freshness, provenance and runtime health. Unsupported writes stay visibly unsupported. | Connect your store, helpdesk, and carriers. We'll tell you when data stops flowing. |
| Operational events are recipient-scoped and deduplicated. Configure in-app preferences for each event type. | Nothing needs your attention yet. We'll notify you when a case does. |
| Test runs perform zero writes; publication enables only future matching events. | Test safely — nothing changes until you publish. |
| Each family has at most one published version and one editable draft. | One live version per flow; edits start as drafts. |
| Create a draft, simulate it against a synthetic case, inspect conflicts, then publish explicitly. | Write a rule, try it on a sample case, then publish when it looks right. |
| Provenance and freshness / Canonical row present / source registry | Data source — "From Shopify · updated 2h ago" |
| No typed evidence items are connected through this object's payout cases. | No evidence linked yet. |
| Missing evidence is collected from connected sources or kept unavailable with a reason. | We'll pull missing evidence from your connected tools automatically. |
| claim type eq item_not_received | If the claim type is "Item not received" |
| Open matching records → (repeated) | View 3 cases → (object named + counted, once) |
| Age 29 days open | Open 29 days |
| Store-scoped identity variants | Order history matches for this store |
| Manual source ingestion | Import from CSV |
| every persisted record carries CSV provenance | Each imported row keeps a link to its CSV line |

Voice: sentence case everywhere (no Title Case Sentences, no trailing periods in labels/pills); verbs on buttons ("Record decision"); numbers get referents ("2 of 5 orders (40%)", never bare "5 (100.0%)").
