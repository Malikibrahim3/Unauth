# Landing Conversion Brief — Messaging, Framing, Hierarchy

Implementation doc only. No code has been changed. Reviewed live at 1440×900 and mobile width on 2026-06-11.

Current section order (from `app/(public)/landing/page.tsx`):

1. `FoundationHero` (pinned) — "EVERY CLAIM LEAVES A TRAIL"
2. `FoundationHeroCta` — full-width "Run a free claim audit" bar
3. `FoundationStatement` — "Evidence, Not Verdicts" + 4 numbered claims
4. `FoundationBento` — industry stats (45%, $4.61, 324M, 24%, $42B)
5. `FoundationSignalsEvidence` — dark "SIGNALS BECOME EVIDENCE" + signal tabs
6. `FoundationHowItWorks` — "CONNECT ONCE. REVIEW EVERY CLAIM WITH CONTEXT." + 4 steps
7. `FoundationFigures` — 98.5% precision / ~20min audit
8. `FoundationFinalCta` — "THE NEXT CLAIM MAY ALREADY HAVE CONTEXT"
9. `FoundationFooter`

---

## The core diagnosis

The page is executed at a high level, but it reads like a generic "premium fraud-tool" page because the **most original things about Unauth are stated in body copy while the headlines say what every competitor says**. Anyone scanning headlines only sees: claims leave trails → fraud is big → signals become evidence → connect once → precision stat → CTA. Signifyd, Riskified, Chargeflow, and Forter could all run that scan-path.

What is actually original here, and currently buried in paragraph text:

- **Evidence, not verdicts.** Unauth never auto-declines. This is a direct wedge against the auto-decisioning incumbents and the single most differentiated claim on the page. It appears as a small bold lead-in inside the Statement section.
- **The cross-merchant network.** Repeat "item not received" abusers are invisible to a single store; the network is the moat. It's mentioned in passing ("participating merchants") and never sold.
- **The privacy posture.** "Identifiers are hashed before they leave your store" — currently a footer one-liner. For the merchant being asked to share data into a network, this is the #1 objection, answered in the least visible place on the page.
- **The free historical audit.** The CTA is genuinely good (an audit of *your own past claims*, not a demo), but the page never shows what the audit deliverable looks like, so it converts as "free trial" instead of "free findings."

Every recommendation below is a version of one move: **promote the wedge from body copy to headline, and demote category wallpaper from headline to body copy.**

---

## 1. Messaging & framing changes (by section)

### Hero (keep position, change subhead + add risk-reducers)

You said don't reorder the top hero — agreed, and the headline "EVERY CLAIM LEAVES A TRAIL" is the strongest line on the page. Keep it. Two changes:

- **Subhead.** "Cross-merchant identity evidence for post-checkout claim reviews" is category-definition language — it names the mechanism, not the buyer or the outcome. A merchant skimming doesn't see themselves in it. Rewrite to name the pain + the wedge, e.g. directionally:
  > *"When a customer says 'it never arrived,' see whether they've said it before — at your store or anyone else's. Evidence for your team. Never an auto-decline."*
- **CTA risk-reducers.** "No card. No auto-actions. Your team decides." exists only at the *final* CTA. The first-impression CTA bar carries none of it. Add a short reassurance line under/beside the hero CTA: *"Read-only audit of your claim history · no card · ~20 minutes."* Risk-reducers belong at the first ask, not the last.

### Statement section — promote "Evidence, Not Verdicts" to the headline

This section's actual headline (visually) is the long paragraph; "Evidence, Not Verdicts." is set small. Invert it. Make **"EVIDENCE, NOT VERDICTS."** the display headline of this section — it's the positioning statement of the company and it's currently typeset like a footnote label. The long paragraph becomes the support copy. The 4 numbered claims (01–04) are good; tighten 04 ("Zero automated decisions, by design") — consider making it 01, since it's the wedge.

### Stats bento — this is the originality problem, demote it (see hierarchy section)

"Post-checkout claims by the numbers" with 45% / 324M / $42B / $4.61 / 24% is the single most generic section on the page — every fraud vendor's site opens with the same Mastercard/LexisNexis category stats. It also sells the *problem* to people who arrived because they already have the problem. Three options, in order of preference:

1. **Replace** with network/merchant-specific numbers as they become available (merchants in the network, claims with prior trails found in pilot audits, median repeat-claimer count per audit). For a network product, network size *is* the product — even small honest pilot numbers ("X pilot merchants · Y matched claim trails") beat big industry numbers.
2. **Compress** to a single horizontal strip (one row, small type, sources inline) used as a credibility beat between sections, not a full-bleed bento that visually outranks the product sections.
3. If keeping the bento, **cut from five stats to three** (45%, $4.61, $42B) — five numbers with mixed units in a scattered layout reads as decoration, and the staggered cards make the eye work to find the point.

### Signals/Evidence section — show the product, not metadata about the product

The dark "SIGNALS BECOME EVIDENCE" section is the right idea, but the tab card shows *fields about* evidence (MATCHED ACROSS / EVIDENCE TYPE / OUTPUT / DECISION) rather than evidence. This is the moment to show a real (anonymized/staged) **evidence pack UI** — the graded signals, the confidence grade, the claim timeline — i.e., what the reviewer actually sees beside a ticket. You have a polished product (audit run pages, evidence detail cards); a real screenshot here does more for conversion than any illustration, and it's the section where "not original for this type of company" is most fixable: competitors show dashboards of *decisions*; you can show a dossier of *evidence with a human decide button missing by design*.

Also: per the binding product-UX guardrail, make sure the grade language here reads as **confidence, not verdict** ("definite match," not "fraudster").

### How It Works — good, one addition

The 4 steps are clear and concrete (Gorgias/Zendesk named — keep that). Add the privacy posture *here*, at step 01/02 where the merchant mentally hands over data: a small inline note — *"Identifiers are hashed before they leave your store. Raw customer data never enters the network."* Don't make the user discover the best privacy line in the footer.

### Figures — reframe honesty as strength

"98.5% — Synthetic benchmark · default threshold" is honest but reads weak, and the fine print ("Benchmark results depend on…") visually undercuts it. Reframe around the *audit deliverable* instead of the model: lead with **"~20 min — see your own number"**: the audit reports precision/match counts on *your* history, which is a stronger claim than any benchmark. Keep the benchmark as the secondary figure with its caveat. ("Built for precision before volume" is a good line — keep.)

### Missing entirely: objection handling and social proof

- **No FAQ on the new page** (the old landing had `FaqSection`). The buyer's real objections — *Will this flag good customers? What data leaves my store? Does it touch my refund flow? What does it cost? What happens after the free audit?* — have no home. Add a compact FAQ before the final CTA. Pricing absence is conspicuous; even "Free pilot · pricing after your audit" is better than silence.
- **No social proof of any kind** — no logos, quotes, counts. If pilot merchants can't be named, use anonymized pilot quotes or network counts. One real merchant sentence ("We found the same 'never arrived' address across 14 orders in the audit") is worth more than the entire stats bento.

### Voice note (cross-cutting)

The page has two registers: terse display lines (good) and mechanism-heavy connective copy ("cross-merchant identity evidence," "post-checkout claim reviews," "review-ready evidence" — each appears 3+ times). Pick the plain-English versions in body copy: "claims," "refund and chargeback reviews," "what your team sees beside the ticket." The jargon repetition is a big part of why the page feels like the category template.

---

## 2. Section order changes (hero stays first)

**Current:** Hero → CTA bar → Statement → **Stats bento** → Signals/Evidence → How It Works → Figures → Final CTA

**Recommended:** Hero → CTA bar → Statement *(re-headlined "Evidence, Not Verdicts")* → **Signals/Evidence (moved up)** → How It Works → **Proof block: Figures + social proof/network numbers (merged)** → **Stats strip (demoted, compressed)** → **FAQ (new)** → Final CTA

Rationale for each move:

1. **Signals/Evidence up one slot (swap with stats bento).** Right now a visitor scrolls through ~2 full viewports of industry statistics before seeing anything resembling the product. The dark evidence section is the "what you actually get" moment; it should come immediately after the positioning statement while attention is highest. Problem-priming stats before product is the ordering every competitor uses; product-before-stats is both higher-converting for an already-pained audience and less template-like.
2. **Stats bento demoted to a compressed strip near the bottom** (or replaced per §1). After the visitor has seen the product and how it installs, category-scale numbers work as a final "this is worth solving now" nudge into the CTA. As slot 3 they're wallpaper; as slot 7 they're a closer.
3. **Figures merged with proof.** 98.5%/~20min alone is thin as a standalone section. Combined with network counts/pilot quotes it becomes a single "proof" beat — benchmark + your-own-audit framing + who's already in the network — placed after How It Works, where the visitor is asking "ok, but does it work?"
4. **FAQ inserted before Final CTA** so the last thing before the ask is objections answered, not objections unaddressed.

Net scroll-story: *Trail exists (hero) → we hand you evidence, never verdicts (statement) → here is the evidence, literally (product) → here's how little it takes to install (how) → here's why to believe it (proof) → the problem is only growing (stats strip) → your questions (FAQ) → run the audit (CTA).*

---

## 3. Smaller hierarchy/visual notes

- **All-caps display for every section title flattens hierarchy** — Statement, Signals, How It Works, Final CTA all shout at the same volume, so nothing reads as *the* message. Reserve the full-bleed caps treatment for hero + one mid-page moment (Signals/Evidence) + final CTA; let How It Works and proof sections drop to a quieter title scale.
- **CTA label consistency:** nav says "Run free audit," hero bar and final say "Run a free claim audit," figures section says "See the live demo," signals says "See the evidence flow," how-it-works says "See the setup flow." Three secondary CTAs with similar weight dilute the primary. Keep one primary ("Run a free claim audit," identical string everywhere) and at most one secondary ("See the live demo").
- **Hero CTA bar (mobile):** the full-width dark bar pinned at the bottom of the hero is strong; carry the same persistent-CTA affordance through mid-page on mobile (the nav pill currently survives scroll but the CTA doesn't).
- **Sources line** under the stats is set in a mono/typewriter face that's near-illegible at rendered size; if stats stay, give sources a legible footnote treatment — credibility text that can't be read provides no credibility.

## Suggested implementation order

1. Copy-only pass (no layout): hero subhead, risk-reducer line at hero CTA, Statement headline inversion, CTA label unification, privacy line into How It Works. Cheapest, highest leverage.
2. Reorder sections in `page.tsx` (Signals up, Bento down+compressed, Figures merged into proof block).
3. New material: evidence-pack screenshot in Signals section, FAQ section, social-proof/network numbers as they exist.
