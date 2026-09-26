# Loop landing interaction study

Status: reference observations and possible Unauth additions, not an approved
implementation plan. No runtime changes made in this pass.

Source: [Loop homepage](https://www.loopreturns.com/), personally visited and
operated in the in-app browser on 16 September 2026, approximately 13:35–13:46
UTC, at 1280 × 720. This is a fresh live review, not a restatement of the earlier
extraction. Observations below distinguish tested behaviour from proposals.

## What lost personality in our last pass

The owner's feedback is that the refinement lost some of the app's personality.
The pass simultaneously reduced display weight, changed section headings to
sentence case, flattened the header, removed outlined navigation pills, squared
off actions and quietened the capability selector. Together these changes made
the page more conventional. That was too broad a response to a request to stay
very close to the existing appearance.

Recommended correction, pending implementation: restore strong uppercase type
for selected short section statements, rounded primary actions, more tactile
selection states and some separation around the header. Keep readable body
copy, the current palette, layout and spacing. Distinguish Unauth through its
own evidence imagery, motion and precise brand details, rather than removing
the expressive qualities the owner liked. Do not blanket-revert unrelated work.

## Observations and opportunities

| Pattern | What I actually observed or operated | Possible Unauth interpretation | Priority |
|---|---|---|---|
| Atmospheric hero transition | Scrolling beyond the opening text reveals blue, cloud-like imagery around the next stage. A large `sky.webp` image wrapper has live scale/rotation transforms; observed rotation differed between scroll positions. | One restrained hero sequence: source fragments approach an evidence checkpoint, settle into a case, and leave the merchant decision visibly separate. Warm paper, charcoal and orange; original composition and assets. | High, after artwork direction |
| Interactive product playground | Switched Tracking, Editing and Returns. Tracking exposes notification and tracking-page states. Opening Edit order reveals a working editing preview with nested controls. Returns changes the stage into a return portal. | Let visitors move through the existing fictional case's Inspect → Decide → Outcome flow in a strong visual stage. Reuse the canonical fixture and simulation contract. The changing evidence should visibly explain a changing recommendation. | High |
| Paired accordion and imagery | Clicked Exchanges in the operations section. Returns collapsed, Exchanges expanded, its plus became a minus, and the right-hand illustration changed. DOM inspection caught an intermediate animated height before it settled. | Selecting an evidence input should reveal its explanation and focus the relevant source fragment in the adjacent visual. Maintain the overall frame so the page does not jump. | High |
| Oversized capability selector | Clicked the flexibility/control item. Selected background, heading, body, CTA and illustration changed together within the coloured section. | Give the existing Work / policy / loss-pattern selector a more expressive selected panel and a coordinated visual transition. Preserve Unauth's actual capability boundaries. | Medium |
| FAQ selection | Clicked the international-brands question. The previously open answer closed; the selected question acquired a tight highlight behind its text. Expansion indicators changed with the answer state. | A subtle warm highlight or orange accent for the active question, with short answer expansion and an explicit state indicator. Retain keyboard and reduced-motion support. | Medium, small addition |
| Persistent header and product menu | Header remains present lower down the page. Opened Products and dismissed it with Escape. Its menu groups custom line icons with compact links and a separated secondary group. | Restore a little tactile definition to the current header. Use Unauth's existing mark and concise navigation; a large menu is unnecessary for the current route set. | High for personality; low for a mega-menu |
| Moving brand and feature rails | Saw the logo strip and later the illustrated feature cards at different horizontal positions. Computed marquee rules showed continuous linear cycles of roughly 70 seconds in this viewport. | Keep the existing integration rail as the one ambient moving strip. Improve its pauses and category treatment if needed; another moving feature carousel is low-value duplication. | Low |
| Circular customer journey | Inspected a large circular diagram separating purchase stages, with small line icons and surrounding explanations. Its icon wrappers carry transition classes. I did not establish the complete active-node trigger or sequence. | Consider an evidence → decision → recovery → reconciliation diagram with a distinct, non-circular geometry. Stage selection could reveal one explanation, with every stage readable without motion. | Explore only |

## Smaller details worth retaining as references

- Strong, rounded display lettering contrasts with much quieter body copy.
  Distinction can come from a few original details while preserving that contrast.
- The product illustrations are composed as scenes with strong foreground focus,
  rather than repeated screenshots in identical cards.
- A rendered CTA SVG uses a 150ms hover rotation rule. This was inspected in
  the DOM, not confirmed through a pointer-hover test. A small directional
  response could suit Unauth's existing arrow treatment.
- The playground's substep row declares a 220ms transform/opacity transition.
  This is an observed implementation detail, not a timing specification to copy.

## Recommended sequence

1. Correct the loss of personality in the static styling first. Compare the
   saved pre-refinement state with the current page and retain the successful
   original qualities selectively.
2. Develop one original hero/artwork concept that expresses Unauth's evidence
   gate. Keep the current placeholders until that work is separately authorised.
3. Add coordinated evidence-selection and fictional-case transitions using the
   existing owners. These teach the product and provide the most useful motion.
4. Add only a few control details: active FAQ treatment, clear selected states,
   and restrained CTA feedback. Avoid making every section animate.

Suggested motion character for Unauth: purposeful arrival, alignment and reveal;
brief settling without elastic bounce; one focal movement at a time. This is a
proposal, not observed Loop behaviour or an adopted design rule.

## Boundaries and limitations

No Loop assets, font binaries, animation code or bundles were copied. No store
URL, contact information, chat message or form was submitted. The visible
playground was used only to explore its preview states; no checkout or order
confirmation was performed.

Loop's chat panel obscured part of the right-hand content during this session;
that overlay is not recommended for Unauth. Smooth scrolling also required
settled observations after actions. Exact easing, frame rate, reverse-scroll
behaviour, all hover states, mobile adaptations and reduced-motion behaviour
were not verified. This is not a full accessibility or performance audit.

Do not reproduce Loop's blue/cloud artwork, circular journey, distinctive
illustration framing or entire combination of design details. Preserve the
mechanism's purpose and develop Unauth's own visual execution. No customer
logos, security claims, automated actions, savings or financial success should
be invented to populate an animation. Proposed outcome motion must preserve
recommendation, merchant decision, provider response, receipt and reconciliation
as separate states.

Execution authority remains [PUBLIC_EXPERIENCE_TRANSFORMATION.md](PUBLIC_EXPERIENCE_TRANSFORMATION.md).
These notes do not authorise implementation or close any acceptance gate.

## Owner-authorised implementation follow-up

The owner's subsequent “do it” instruction authorised the personality restoration
and original evidence-focused motion. Implemented in PublicEvidenceVisuals.tsx,
PublicInteractions.tsx and the existing public CSS owner: a bounded gate sequence,
fixture-backed case receipts, paired evidence excerpts and selection feedback.
The Loop observations above remain reference notes, not a claim of copied motion
or artwork. Verification and remaining limits are recorded in
`artifacts/public-personality-2026-09-16/verification.md`.
