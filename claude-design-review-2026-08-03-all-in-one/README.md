# Unauth authenticated design-review capture — all-in-one flat folder

Every deliverable is directly in this folder: PNG screenshots, contact-sheet JPGs, and the handoff documents. There are no nested asset folders.

This package is a post-authentication visual handoff for Claude. It was captured from the seeded merchant account:

- Workspace: Simeon Murray Store
- Seeded operator shown in the app: `simeonmurray123@gmail.com`
- Capture date: 3 August 2026
- App: Unauth — Post-Purchase Payout Control

No login or authentication screen is included. The local test-only authentication route was used only to establish the seeded session; its secret is intentionally not recorded here.

## Contents

- [Screenshot manifest](screenshot-manifest.md) — one-line labels, routes, states, and capture notes for every canonical PNG.
- [Design description](design-description.md) — the product model, visual language, layout system, interaction model, and critique prompts.
- [Coverage notes](coverage-notes.md) — what was intentionally captured, what was expanded, and which states are truthful seeded loading/error/unavailable states.
- [Contact sheet 1 — foundations and queues](./01-foundations-and-queues.jpg)
- [Contact sheet 2 — dashboard, settings, and utility](./02-dashboard-settings-and-utility.jpg)
- [Contact sheet 3 — expanded and detail states](./03-expanded-and-detail-states.jpg)
- [Contact sheet 4 — deep settings states](./04-settings-deep-dive.jpg)

## Capture conventions

- 62 canonical PNG screenshots are included.
- Screenshots are desktop in-app-browser captures at the normal working viewport; `full` files are full-page captures, while `viewport` files are viewport-only captures.
- The sidebar, global utility bar, workspace identity, seeded data, and operational copy are preserved so Claude can judge the complete product shell and not isolated component mockups.
- Menus, filters, segmented metric states, chart data, trust details, command palette, account menu, collapsed navigation, recovery actions, and recovery case context were opened and captured where the UI exposed them.
- `02-work-queue-viewport.png` is an obsolete skeleton/loading capture and is excluded from the canonical manifest.
- `63-flow-detail-triage-sync-failures.png` is an obsolete first-frame skeleton capture; the populated state is `64-flow-detail-triage-sync-failures-loaded.png`.

## Suggested Claude critique brief

Please critique the product as an operational SaaS workspace for ecommerce payout, loss, and recovery decisions. Evaluate visual hierarchy, information density, typography, spacing, navigation, status semantics, table/board scanning, progressive disclosure, accessibility and keyboard behavior, data-trust communication, loading/error/empty states, and the relationship between recommendation and merchant-owned decision. Treat the screenshots as a desktop-first reference; mobile and responsive behavior are not represented by this capture.
