# Landing — Live-Images Pass: Audit & Fix Plan

Audit of commit `1a1d986` ("Fix demo seed and merchant data queries"), which replaced custom artifacts with raw screenshots. This is the work the user describes as "very badly designed" and making the landing "look cheap."

---

## 1. What Codex actually changed

Two surfaces were swapped from hand-built artifacts to PNG screenshots:

| Surface | Before | After (current) |
|---|---|---|
| `§3 PipelineTabs` right-hand artifact (tabs 01–04) | Four bespoke SVG/HTML artifacts: `UploadArtifact`, `HashArtifact`, `ResolveArtifact`, `CaseArtifact` (still defined at [PipelineTabs.tsx:319](app/(public)/landing/_components/PipelineTabs.tsx:319), [:373](app/(public)/landing/_components/PipelineTabs.tsx:373), [:471](app/(public)/landing/_components/PipelineTabs.tsx:471), [:682](app/(public)/landing/_components/PipelineTabs.tsx:682) — now **orphaned dead code**) | Single generic `ScreenshotArtifact` ([PipelineTabs.tsx:149](app/(public)/landing/_components/PipelineTabs.tsx:149)) rendering one of four screenshots from `SCREENSHOT_ARTIFACTS` ([:52](app/(public)/landing/_components/PipelineTabs.tsx:52)). |
| `§4 Merchant dashboard` | `<MerchantDashboard />` — bespoke SVG dashboard component ([MerchantDashboard.tsx:550](app/(public)/landing/_components/MerchantDashboard.tsx:550) — now **orphaned**) | `<LandingScreenshotFrame src="/screenshots/dashboard.png" />` ([page.tsx:1035](app/(public)/landing/page.tsx:1035)) |

---

## 2. Why it looks cheap — concrete findings

### 2.1 Tab artifacts don't match their tab content (the biggest problem)

The pipeline section narrates a 4-step story: **Upload → Hash → Resolve → Case File**. Each tab's left column describes one specific step.

The screenshots Codex wired to those tabs are unrelated product pages:

| Tab | Tab copy says… | Screenshot shown |
|---|---|---|
| 01 Upload | "CSV parse latency · 11 ms" | `dashboard.png` (charts + cases) |
| 02 Hash | "0 PII fields transmitted… HMAC-SHA256" | `watchlist.png` |
| 03 Resolve | "7 merchants in the surfaced cluster… k ≥ 3 threshold" | `global-graph.png` |
| 04 Case File | "0.92 risk · DEFINITE verdict · CONF 0.96" | `evidence-packages.png` |

None of the four screenshots illustrate the step the tab is describing. The original `UploadArtifact` showed an actual CSV parse view; `HashArtifact` animated the hashing transition; `ResolveArtifact` showed the cluster surfacing; `CaseArtifact` showed the verdict packet. Codex deleted that narrative and replaced it with four unrelated product tours.

### 2.2 Screenshots are low-resolution and not retina

All eight files in `public/screenshots/` are **1440×1000 @ 1×**, served via `<img>` with `width: 100%`. On the live page the frame is ~900–1100 CSS px wide on desktop, and at retina (2×) the browser is upscaling these images. They render soft and "screenshot-y" — the dominant tell of an AI-built landing page.

Server-side: no `next/image`, no AVIF/WebP, no `srcSet`, no `priority`, no blur placeholder. `loading="lazy"` on the hero-adjacent dashboard image is also wrong (it should be eager).

### 2.3 The "browser chrome" frame around screenshots is fake

`ScreenshotArtifact` ([PipelineTabs.tsx:149](app/(public)/landing/_components/PipelineTabs.tsx:149)) and `LandingScreenshotFrame` ([LandingScreenshotFrame.tsx:20](app/(public)/landing/_components/LandingScreenshotFrame.tsx:20)) both wrap the PNG in a fake macOS-style traffic-light chrome bar with a tiny `LABEL` on the right. But:

- The screenshots themselves already include the app's own header/sidebar — so we're showing **two stacked chromes**: a fake browser chrome wrapping a real app chrome.
- The traffic lights are recoloured red/orange/grey (`#8A2828`, `#C07838`, `#8A8472`) to match the brand, which makes them read as decorative dots rather than browser controls — neither honest nor minimal.
- The `perspective(1400px) rotateX(4deg) rotateY(±5deg)` tilt is the exact "AI hero mockup" cliché. Ramp, Linear, Vercel, Stripe — none of them tilt screenshots in 2026.

### 2.4 Two different frame components, drifted

`ScreenshotArtifact` (PipelineTabs) and `LandingScreenshotFrame` (§4) are 95% the same component with slightly different shadows, tilts, glow colours, and label styling. They should be one component.

### 2.5 Copy was "matched" by softening, not by truth

In the same commit Codex rewrote the §7 Security copy from concrete claims ("Sensitive data is hashed in browser") to abstract reassurance ("Built so raw customer data does not become the product"). The new copy reads like a privacy policy preamble — vaguer than what it replaced and not actually a match for any image.

In the `truth update` follow-up (`5e9433c`) the user already pushed back on some of this by renaming "RISK 0.92" → "CONF 0.92" across the hero and Case tab. Worth confirming whether that rename was intentional brand language or another Codex softening to roll back.

### 2.6 Dead code left in the tree

- `UploadArtifact`, `HashArtifact`, `ResolveArtifact`, `CaseArtifact` in `PipelineTabs.tsx` — ~620 lines, no callers.
- `MerchantDashboard.tsx` — 838 lines, no callers.
- Unused screenshots: `identity-detail.png`, `landing-dashboard-section.png`, `landing-how-it-works.png`, `landing-top.png`.

### 2.7 Minor

- `<img>` with no explicit `width`/`height` → CLS on slow connections.
- `alt` text says "Live Unauth dashboard" — the screenshots are seeded demo data, not live. Either rephrase or remove the word "live."
- The radial-gradient glow behind §4's frame uses `inset: '-7% -4% auto'` with `height: '46%'` — the proportions don't survive when the frame is wide on desktop; the glow drifts off the top edge.

---

## 3. Fix plan

Sequenced so each step is independently shippable.

### Step 1 — Restore tab–artifact alignment (highest impact)

**Goal:** each pipeline tab shows the artifact that illustrates *that step*, not a generic product screenshot.

Recommended approach: **revert to the bespoke artifacts** that already exist in the file.

1. In [PipelineTabs.tsx:1068](app/(public)/landing/_components/PipelineTabs.tsx:1068), replace:
   ```tsx
   <ScreenshotArtifact artifact={SCREENSHOT_ARTIFACTS[active]} />
   ```
   with the original switch:
   ```tsx
   {active === 0 && <UploadArtifact />}
   {active === 1 && <HashArtifact progress={hashProgress} />}
   {active === 2 && <ResolveArtifact />}
   {active === 3 && <CaseArtifact />}
   ```
   (Confirm the `hashProgress` state hook still exists; if removed in `update2`, restore from `git show 1a1d986^:app/(public)/landing/_components/PipelineTabs.tsx`.)
2. Delete `SCREENSHOT_ARTIFACTS` ([:52](app/(public)/landing/_components/PipelineTabs.tsx:52)) and `ScreenshotArtifact` ([:149](app/(public)/landing/_components/PipelineTabs.tsx:149)).
3. Keep the dwell/auto-advance behaviour as-is.

If the user instead wants real product screenshots in tabs, then each screenshot must be of the *specific surface that step produces* — a CSV preview for Upload, a hashing-state row for Hash, a cluster surfacing for Resolve, a case file for Case File. Today the captures don't exist; capturing them belongs in a separate task.

### Step 2 — Decide §4 Merchant Dashboard treatment

Two options, pick one:

- **Option A — Restore bespoke `<MerchantDashboard />`.** Bring back the import and render in [page.tsx:1035](app/(public)/landing/page.tsx:1035). Honest with the rest of the page (which uses crafted artifacts everywhere else) and avoids the soft-PNG problem entirely.
- **Option B — Keep a real screenshot, but do it properly.** Then:
  - Re-capture at **2880×2000** (2× retina) or **2880×1800** (16:10) of the *real* dashboard with seeded demo data, headless, with the app sidebar **cropped out** (frame should not contain a second chrome).
  - Replace `<img>` with `next/image`, supply explicit `width`/`height`, `sizes="(min-width:1280px) 1100px, 100vw"`, `quality={92}`, `priority={false}`.
  - Drop the fake browser chrome bar (no traffic lights, no `LABEL`). Use a flat 1px border + soft shadow only.
  - Remove the `perspective/rotate` tilt. No skew.

Recommendation: **A** for now (zero capture cost, matches the rest of the page's craft level), with B as a follow-up once we have time to capture properly.

### Step 3 — Collapse `LandingScreenshotFrame` and `ScreenshotArtifact`

If Step 2 picks Option B, delete `ScreenshotArtifact` ([:149](app/(public)/landing/_components/PipelineTabs.tsx:149)) and use one shared `LandingScreenshotFrame` everywhere. If Step 2 picks Option A, delete `LandingScreenshotFrame.tsx` entirely.

### Step 4 — Strip the AI-mockup tells from the surviving frame

In whichever frame component remains:

- Remove the macOS traffic-light row.
- Remove the `transform: perspective(...) rotate*(...)` and the `transformOrigin` line.
- Reduce the glow: keep at most one soft shadow (`0 24px 60px -32px rgba(26,24,20,0.18)`), drop the radial-gradient halo behind the frame.
- Border: `1px solid #D8D0BD`. No inset highlight on cream backgrounds (the `inset 0 1px 0 rgba(255,255,255,0.75)` reads as plastic).

### Step 5 — Copy honesty pass

- Audit the §7 Security copy diff in `1a1d986` ([page.tsx around :1077](app/(public)/landing/page.tsx) onward). Decide line-by-line whether the softened version or the original ("Sensitive data is hashed in browser") is the truthful claim. Default to the more concrete original unless legal disagrees.
- Confirm the `CONF 0.92` rename from `5e9433c` is correct brand language across hero ([page.tsx:380](app/(public)/landing/page.tsx:380)), Case tab pills ([PipelineTabs.tsx:707](app/(public)/landing/_components/PipelineTabs.tsx:707)), and Resolve mono label ([PipelineTabs.tsx:658](app/(public)/landing/_components/PipelineTabs.tsx:658)).
- Replace `alt="Live Unauth ..."` with `alt="Unauth ..."` if the data is seeded demo.

### Step 6 — Dead-code sweep

Once Steps 1–2 are merged, delete whichever is left orphaned:

- If Step 1 reverts to bespoke artifacts → no deletions there.
- If Step 2 picks Option A → delete `LandingScreenshotFrame.tsx`, drop `dashboard.png` and the three pipeline screenshots from `public/screenshots/`.
- Either way, audit `public/screenshots/` against actual imports and delete unused PNGs (`identity-detail.png`, `landing-dashboard-section.png`, `landing-how-it-works.png`, `landing-top.png` look unused — grep before deleting).

---

## 4. Out of scope for this fix

- Replacing the §1 hero card with a real screenshot. The current hero case-file artifact ([page.tsx:311](app/(public)/landing/page.tsx:311)) is bespoke and works — don't touch it.
- The §5 network section. Codex didn't put a screenshot there.
- Capturing new product screenshots. If we go Step 2 / Option B, that's a separate task — needs seeded data, headless capture script, retina output, and sidebar-cropped framing.

---

## 5. One-line summary if asked

> Codex pointed four pipeline-step tabs at four unrelated product screenshots, deleted the bespoke `MerchantDashboard` artifact for a tilted soft PNG, left ~1,500 lines of orphaned components in the tree, and softened the security copy in the same pass. Fix is to restore the bespoke artifacts (Step 1 + Step 2A), strip the fake browser chrome + tilt, and sweep the dead code.
