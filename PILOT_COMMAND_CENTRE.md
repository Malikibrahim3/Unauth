# Unauth Pilot Command Centre

Last reviewed: 22 July 2026

This is the one page to open when deciding what to do next. It is deliberately
shorter and plainer than the technical audit. Technical evidence remains in
`docs/audits/unauth-mvp-plus/`.

## Current operating mode: Completion Mode

The chosen sequence is:

1. Finish and certify the existing MVP+ scope.
2. Begin outreach only after the MVP+ completion gate is green.
3. Recruit one design partner for a supervised shadow pilot.

There is no outreach target during Completion Mode. The product outcome is to
finish the already-defined MVP+ contract without adding new scope.

The later pilot outcome is one qualified ecommerce merchant completing a
supervised 14-day shadow pilot in which Unauth helps their team review real
post-purchase payout cases without automatically approving, denying, refunding,
or moving money.

## Feature-freeze rule

A task may enter active work only when it does at least one of these:

- closes a P0/P1 requirement in the MVP+ requirements matrix;
- produces missing evidence needed to change `NOT VERIFIED` to an honest result;
- fixes a defect blocking a completion gate; or
- removes or corrects a misleading product claim.

New integrations, speculative features, and non-essential polish go to the
Parking lot. If a task cannot name the requirement or completion gate it closes,
it is not active MVP+ work.

## What can happen now

| Activity | Status | Boundary |
|---|---|---|
| Building and verifying the frozen MVP+ scope | ACTIVE | This is the only current phase. |
| Merchant discovery or outbound outreach | PAUSED BY CHOICE | Begins after the MVP+ completion gate is green. |
| Product demos and design-partner recruitment | LATER | Begin in the outreach phase. |
| Connecting real merchant systems or importing identifiable customer data | NOT YET | Wait for every Shadow Pilot gate to be green. |
| Letting Unauth take an irreversible financial/customer action | OUT OF SCOPE | The merchant remains in control; the first pilot is advisory and supervised. |

## This week's one outcome

Only one completion outcome may be active. Everything else waits.

### Active

**Prove tenant and authorisation boundaries.**

- Next visible step: finish and record the isolated two-merchant boundary test.
- Done when: the current technical status records a PASS with repeatable evidence.
- Source: `docs/audits/unauth-mvp-plus/remediation-status.md`.

### Parked until MVP+ completion

- Prospect lists, outreach messages, calls, demos, and fundraising preparation.

## The queue

Do not start these while the active completion outcome is unfinished unless
it is genuinely blocked.

1. Prove webhook and event safety.
2. Prove privacy, deletion, and retention behaviour.
3. Complete the remaining P0/P1 product-contract audit.
4. Run the complete source-to-case-to-decision-to-loss-to-recovery journey.
5. Prove failure, empty, loading, denied, and accessibility behaviour on the
   pilot journey.
6. Pass the final local release gate after all MVP+ changes.
7. Rotate previously exposed credentials and redeploy before trusting the
   environment.
8. Run controlled external/provider verification in an isolated non-production
   merchant, with explicit approval.

## MVP+ completion gate

MVP+ is finished only when all of the following are true. “Looks finished,” a
green build by itself, and a percentage-complete estimate do not count.

| Gate | Required evidence | Current status |
|---|---|---|
| Scope frozen | The requirements matrix is the boundary; additions require an explicit scope decision rather than quietly joining the build. | GREEN |
| Complete audit | Every P0/P1 requirement has been examined against code and runtime evidence; none remains `NOT VERIFIED`. | NOT COMPLETE |
| Contract complete | Every in-scope P0/P1 requirement is `PASS`; anything excluded is explicitly `OUT OF SCOPE`. No `PARTIAL`, `MISSING`, `BROKEN`, or `MISLEADING` P0/P1 remains. | NOT COMPLETE |
| Safety remediation | Tenant/auth, webhook/event, privacy/deletion/retention, and durable audit rows in the remediation status are `PASS`. | PARTIAL |
| Complete journeys | Onboarding and the promised source → case → evidence/recommendation → decision → loss/recovery journeys pass from a fresh account, including safe failure and retry paths. | NOT VERIFIED |
| Provider truth | Every visible provider status/capability matches controlled evidence; the strongest supported paths pass isolated lifecycle checks. | PARTIAL |
| Product quality | Required loading, empty, stale, partial, denied, keyboard, responsive, accessibility, and performance checks pass. | NOT VERIFIED |
| Release proof | The latest full local release gate passes after all MVP+ work, including clean database replay, tests, build, tenant boundaries, and audit runtime. | NOT RUN AFTER CURRENT WORK |
| Environment trust | Previously exposed credentials are rotated, hosted configuration is updated, and the intended build is redeployed. | NOT VERIFIED |
| Exact-build rehearsal | The deployed candidate passes controlled non-production provider and end-to-end checks; the build/commit and evidence are recorded. | NOT VERIFIED |
| Known issues | No P0/P1 remains. Every P2/P3 has an owner, safe workaround or acceptance decision, and is not presented as working when it is not. | NOT VERIFIED |

When every row is green, record the completion date, build/commit, deployment,
and evidence links. Completion Mode then ends and outreach becomes the single
active company outcome.

## Phase 3 — Shadow Pilot gate

Status is binary: **green only when evidence exists**. “Probably works” and “a
test exists” are not green.

| Gate | Green means | Current status |
|---|---|---|
| Scope | One merchant profile, supported provider stack, core journey, exclusions, and success metric are written down. | NOT SET |
| Tenant and access safety | Cross-merchant reads/writes fail; role and permission boundaries pass in an isolated runtime. | NOT VERIFIED |
| Webhook and event safety | Requests are authenticated before processing; retries are idempotent; failures are visible and recoverable. | NOT VERIFIED |
| Privacy and secrets | Data removal/retention work on canonical data; required credentials are rotated; no secrets or customer PII leak into logs. | NOT VERIFIED |
| Money and audit truth | Currency/amounts reconcile to known answers; sensitive actions create durable, immutable audit evidence. | PARTIAL — audit runtime passes; full pilot journey does not yet. |
| Core merchant journey | A fresh account completes connect/import → case → evidence and explanation → manual decision → loss/recovery without database edits or invented demo state. | NOT VERIFIED |
| Reliability | Disconnect, bad credentials, duplicate events, partial import, provider outage, and worker failure produce a safe state, useful message, alert, and recovery path. | NOT VERIFIED |
| Usability | One person who did not build Unauth completes the pilot journey without live rescue; keyboard and key failure states work. | NOT VERIFIED |
| Pilot operations | Named support owner, response promise, manual fallback, rollback/export plan, data agreement, known-limitations list, and stop conditions are ready. | NOT VERIFIED |
| Release proof | Latest full local gate is green, then controlled provider/staging checks pass on the exact build intended for the pilot. | NOT RUN AFTER CURRENT WORK |

### Final rehearsal required

Before real merchant data is connected:

1. Run three consecutive rehearsals from a fresh pilot account using the exact
   supported stack and representative cases.
2. Reconcile every amount and case outcome to a known answer.
3. Deliberately exercise at least: duplicate delivery, invalid signature,
   expired/revoked credentials, provider outage, worker retry, and attempted
   cross-merchant access.
4. Have a non-founder complete the core journey without coaching. Record where
   they hesitate or need help.
5. Run in shadow mode for seven days: Unauth recommends and records, while the
   merchant's existing process remains the source of action.

The pilot may start only when every gate above is green, there are no open P0 or
P1 defects, and every accepted lower-severity defect has a disclosed workaround
and owner.

## Bug severity: the fast decision rule

- **P0 — stop:** wrong merchant's data, unauthorised access/action, wrong money
  or currency, irreversible action, secret exposure, lost/corrupted data,
  missing audit history, or no rollback/recovery.
- **P1 — stop:** the target merchant cannot complete the promised core journey,
  or a common failure is silent/misleading.
- **P2 — may pilot with disclosure:** degraded secondary behaviour with a safe,
  tested workaround.
- **P3 — later:** cosmetic polish or an unpromised edge case.

Do not use the number of bugs as the launch measure. One P0 matters more than
fifty P3s.

## The ADHD-friendly operating system

### One capture place

Put every new idea, bug, request, and worry under **Inbox** below. Do not act on
it immediately. Triage it during the daily or weekly reset.

### One daily commitment

Choose:

- **Must:** one outcome-moving task;
- **Bonus:** up to two small tasks, only after Must;
- **First step:** something visible that takes 5–25 minutes.

During Completion Mode, maximum work in progress is one completion task. Maximum
seven items may sit in the weekly queue. A new urgent task must replace an
existing one; it cannot silently join the pile.

### Task card template

Copy this rather than writing vague tasks such as “work on onboarding.”

```text
Outcome:
MVP+ gate/requirement affected:
Why now:
Next visible step (5–25 minutes):
Done when:
Evidence/link:
Blocked by:
Severity: P0 / P1 / P2 / P3 / not a pilot item
```

### Rhythm

- **Start of day (3 minutes):** open this page, choose Must, write the first
  visible step, and begin it before checking the larger backlog.
- **End of day (3 minutes):** record evidence or the exact blocker. Leave the
  next visible step ready for tomorrow.
- **Weekly reset (30 minutes):** update gate statuses from evidence, choose the
  next single completion outcome, delete/defer low-value work, and rehearse one
  piece of the merchant journey.
- If a task survives two work sessions without movement, shrink it or ask for
  help. Do not keep rereading it.

## Phase 2 — company evidence that can speak for the founder

Track only evidence that reduces risk or strengthens the story:

| Evidence | Current | Next milestone |
|---|---:|---:|
| Completed problem interviews | Not recorded | 10 |
| Merchants with the same repeated painful workflow | Not recorded | 3 |
| Qualified design-partner commitments | Not recorded | 2 |
| Shadow pilots started | Not recorded | 1 |
| Pilots reaching the agreed success metric | Not recorded | 1 |
| Referenceable merchant stories | Not recorded | 1 |

For each interview, capture their current process, frequency, cost/exposure,
existing workaround, who owns the problem, urgency, provider stack, security
requirements, and what result would make a pilot worthwhile. Do not build a
feature from one person's opinion; look for a repeated workflow.

## Design-partner conversation questions

1. “Walk me through the last post-purchase payout case that was expensive or
   painful. What happened from first contact to final outcome?”
2. “Where did your team look for evidence, and what was missing or slow?”
3. “What decision was made, who was allowed to make it, and how was it audited?”
4. “How often does this happen, and how do you measure the cost today?”
5. “What would have to be true for you to test a supervised, read-only version?”

## Parking lot — not part of the frozen MVP+ scope

- Additional provider breadth beyond the chosen merchant stack.
- Autonomous approvals, denials, refunds, payouts, or customer accusations.
- Features requested by only one unqualified prospect.
- Polish that does not affect trust, comprehension, accessibility, or the core
  journey.
- Fundraising materials before the pilot story and baseline metric are clear.

## Inbox

- Add uncategorised thoughts here. Triage them; do not let them become today's
  work automatically.

## Useful requests to give Codex

- “Open `PILOT_COMMAND_CENTRE.md`. Show only today's Completion Mode Must and its first
  15-minute step.”
- “Compare the repository evidence with every MVP+ completion gate. Update status
  only where there is repeatable proof; do not start new features.”
- “Triage this issue as P0, P1, P2, P3, or not a pilot item, and explain the
  smallest proof needed to close it.”
- “I am stuck on this task. Break only the next step into a 25-minute action and
  stay with me until it is done.”
- “Run the weekly reset. Keep one Product outcome and one Company outcome; move
  everything else out of active work.”
