---
name: Unauth
description: Instrument-grade decision surfaces for evidence, financial position, and accountable next action.
colors:
  action-violet: "#5B5BD6"
  action-violet-hover: "#4949B8"
  action-violet-pressed: "#3C3C96"
  action-violet-selected: "#ECEBFF"
  canvas-cool: "#F7F7F8"
  paper: "#FFFFFF"
  surface-secondary: "#F4F4F5"
  surface-muted: "#EEEEF0"
  ink-primary: "#18181B"
  ink-secondary: "#52525B"
  ink-tertiary: "#6B6B75"
  line-subtle: "#E7E7EA"
  line-default: "#D8D8DC"
  semantic-info: "#326B9B"
  semantic-success: "#217A5B"
  semantic-warning: "#8A6116"
  semantic-critical: "#B04444"
typography:
  display:
    fontFamily: "Inter Tight, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "48px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: "34px"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  dense:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
  metadata:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  mono:
    fontFamily: "DM Mono, Roboto Mono, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
rounded:
  xs: "4px"
  control: "8px"
  surface: "12px"
  overlay: "16px"
  round: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-violet}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  working-surface:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.surface}"
    padding: "20px"
  status-badge:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.metadata}"
    rounded: "{rounded.round}"
    height: "22px"
    padding: "0 8px"
---

# Design System: Unauth

## Overview

**Creative North Star: "Decision Ledger — Instrument Grade"**

Unauth treats every surface as a decision instrument. Financial position, evidence provenance, uncertainty, responsibility, and the next action form one readable operational thread; they are not flattened into generic administration cards. The visual world is cool, precise, calm under pressure, and Apple-informed in fit and feedback without borrowing an operating-system costume.

One operational object owns the first viewport. Its identity, scope, and action stay compact, while evidence and source truth become subordinate through type, alignment, and tonal hierarchy. Authenticated workspaces, public storytelling, auth, onboarding, and compact embeds share one identity at different densities. Browser and helpdesk embeds are **Pocket Briefs**: self-contained decision summaries, not miniature dashboards.

**Key Characteristics:**

- Evidence-first, decision-led, and financially precise
- One dominant operational object per surface
- Cool neutral planes with restrained violet interaction
- Source beacons, evidence threads, financial equations, and board lanes
- Joined and flat at rest; lifted only when genuinely floating
- Responsive through reflow, never through loss of essential work

## Colors

The palette is a cool neutral field with one restrained violet action voice. Neutral planes establish hierarchy; semantic hues are local evidence, never page decoration.

### Primary

- **Action Violet:** primary actions, focus, current selection, and product-owned primary data.
- **Selected Violet Wash:** selected rows, filters, and controls that need a quiet persistent state.

### Neutral

- **Cool Canvas:** the continuous authenticated work area and the neutral ground behind Pocket Briefs.
- **Paper:** the reading, editing, navigation, and primary working plane.
- **Supporting Grey:** joined headers, inset groups, and subordinate context.
- **Primary Ink:** page identity, amounts, equations, and decisive facts.
- **Secondary Ink:** body copy, controls, and supporting facts.
- **Tertiary Ink:** provenance and metadata; never the only carrier of meaning.
- **Structural Lines:** subtle joins and a default containment edge.

### Tertiary

- **Semantic Info, Success, Warning, and Critical:** local state dots, icons, text, badges, and contained notices. Each meaning is paired with a textual or iconic cue.

**The One Voice Rule.** Violet means interaction, current selection, or product-owned primary data. It never means success, warning, risk, or freshness.

**The Local State Rule.** Semantic meaning stays local to the fact through a dot, icon, text label, badge, or contained notice; it does not tint an entire working surface or become a semantic side rail.

## Typography

**Display Font:** Inter Tight with Inter and system sans-serif fallbacks, for deliberate public display only  
**Body Font:** Inter with system sans-serif fallbacks  
**Label/Mono Font:** DM Mono for identifiers, hashes, API keys, code, and payloads only

**Character:** The product hierarchy is compact, modern, and legible. Inter carries interface copy, dates, percentages, and money; financial figures use tabular numerals rather than monospace. Inter Tight appears only when public storytelling needs intentional display compression.

### Hierarchy

- **Display:** public hero language only; never routine product chrome.
- **Headline:** one authenticated page identity.
- **Title:** major sections and working regions.
- **Body:** forms, explanations, and ordinary prose; keep long prose near 68 characters per line.
- **Dense:** tables, toolbars, board items, and compact evidence.
- **Label:** form and control labels in sentence case.
- **Metadata:** source, time, freshness, ownership, and provenance.
- **Mono:** machine-origin identifiers and code, not money or metrics.

**The Identity Rule.** The largest interface type names what the operator is looking at, not the product, navigation section, or implementation concept.

**The Sentence-Case Rule.** Interface labels, statuses, tabs, and supporting headings use sentence case; typographic shouting is not a hierarchy tool.

## Layout

Authenticated pages use a continuous canvas, a compact navigation plane, a utility toolbar, and a centered work frame capped at 1600px. The shared spacing rhythm is built around 8px, 12px, and 16px, with 20–32px reserved for surface and page insets. The first viewport gives one operational object clear ownership; supporting evidence and source truth sit beside or below it without matching its visual weight.

Wide detail views may pair the main story with a 288–352px contextual inspector. Board lanes hold a readable fixed width and scroll inside their owning work surface. Settings may use a stable local rail at wide desktop sizes, then move navigation into the document flow. Below 1024px, layouts reflow, stack, and consolidate facts while preserving every critical task; narrow effective widths caused by zoom or text scaling remain operable.

Public pages use editorial breathing room and truthful product proof. Auth uses a direct form and an evidence-led context panel on wide screens, collapsing to a single 420px form column below 960px. Pocket Briefs honor their host: the browser popup is 360px wide and helpdesk surfaces fit an approximately 300px rail.

**The Dominant Object Rule.** Within five seconds, a viewer must be able to name the surface's primary object and the next meaningful action.

**The Evidence Thread Rule.** When a view contains multiple evidence or financial stages, connect them as a readable sequence instead of presenting equal disconnected cards.

## Elevation & Depth

Inline surfaces are flat. Depth comes from tonal planes, spacing, alignment, and joined dividers. Menus, tooltips, drawers, modals, and other genuinely floating layers may use restrained shadows. Focus is a violet ring, not a lift; controls do not translate on press.

Public storytelling may use a restrained grounded shadow on a real product frame or floating navigation object. That treatment does not migrate into product containers, auth, onboarding, or Pocket Briefs.

### Shadow Vocabulary

- **Raised:** minimal separation for a transient raised control or preview.
- **Floating:** menus and compact transient layers.
- **Overlay:** drawers and modals that sit above a backdrop.

**The Flat-by-Default Rule.** If content remains in document flow, it does not earn a shadow.

## Shapes

Controls use gently curved corners (8px). Working surfaces use a more generous radius (12px), and overlays use the broadest system radius (16px). Small geometry (4px) is reserved for tooltips and tightly clipped details. Fully round geometry belongs to status dots, badges, avatars, and equation operators—not ordinary actions or containers.

A parent working surface owns the perimeter. Children use joins, dividers, inset tones, and alignment instead of nested framed cards. The recurring 8/12/16px geometry keeps authenticated, public, auth, and embedded surfaces recognizably related.

## Components

### Buttons

- **Shape:** restrained control corners with 30px, 36px, and 40px role-based heights.
- **Primary:** violet fill and white text for the single forward action in a region.
- **Commit:** near-black fill for monetary or irreversible confirmation; never equal in emphasis to a primary action in the same region.
- **Secondary / Ghost:** paper or transparent fill with a quiet structural border or no border.
- **Hover / Focus:** tonal color change and the shared violet focus ring; no movement.

### Chips

- **Style:** compact, sentence-case controls with quiet borders.
- **State:** selected filters use the violet wash. Status badges use a semantic dot, text, and a contained soft fill; filters and statuses never share meaning.

### Cards / Containers

- **Corner Style:** 12px for a true working surface; 8px for an inset group.
- **Background:** paper for the primary plane and cool grey for supporting context.
- **Shadow Strategy:** none inline.
- **Border:** one subtle perimeter when containment is necessary.
- **Internal Padding:** 16px dense, 20px standard, and 24px relaxed.

### Inputs / Fields

- **Style:** paper field, 8px corners, 36px default height, and a quiet default border.
- **Focus:** violet ring with no geometry change.
- **Error / Disabled:** explanatory text or icon plus state styling; never opacity or color alone.

### Navigation

Navigation stays on a quiet paper plane. Active items use a restrained violet wash, stronger text, and an interaction marker. In-page navigation uses underlines or compact grouped links; it does not borrow mobile tab-bar or segmented-control metaphors.

### Decision Instruments

- **Source Beacon:** provider identity, source record, freshness, and limitations in one compact row.
- **Evidence Thread:** connected source facts, findings, recommendations, decisions, and outcomes with visibly different authority and truthful gaps.
- **Financial Equation:** auditable monetary stages separated by visible operators; values remain tabular and keep explicit currency.
- **Board Lane:** a fixed-width stage column that scrolls inside its working surface and preserves readable task density.

### Pocket Brief

Embedded browser and helpdesk surfaces order content as identity and connection state, decisive finding, supporting signals, then next action. They locally package Inter and DM Mono, use 13px body type, 7–9px local radii, 38px primary controls, and the same cool canvas, paper, ink, semantic, and violet roles. They do not inherit desktop navigation or dashboard chrome.

## Do's and Don'ts

### Do:

- **Do** make one work object visually dominant on every surface.
- **Do** keep financial position, evidence provenance, uncertainty, and next action visible in one readable thread.
- **Do** preserve URL state, permissions, financial definitions, source labels, keyboard access, and truthful unavailable states.
- **Do** use spacing, alignment, joined sections, and tonal planes before adding borders.
- **Do** keep monetary values tabular and in their recorded currency.
- **Do** preserve one cool-neutral identity across public, auth, onboarding, authenticated, and embedded surfaces.
- **Do** verify responsive reflow below 1024px, 200% zoom, reduced motion, forced colours, and keyboard operation.

### Don't:

- **Don't** recreate card soup, equal KPI slabs, or decorative dashboard infographics.
- **Don't** imitate iOS tab bars, sheets, segmented navigation, traffic lights, fake browser chrome, or platform-specific assets.
- **Don't** use gradients, glass, blur, or decorative shadows in authenticated, auth, onboarding, or embedded surfaces.
- **Don't** use violet for risk, success, warning, or data freshness.
- **Don't** use whole-surface semantic slabs or side stripes when a local dot, icon, label, badge, or notice communicates the state.
- **Don't** use uppercase eyebrows, emoji, or text glyphs as interface iconography.
- **Don't** scale a desktop page into an embed; design the Pocket Brief for its native host width.
