# Unauth repository instructions

Read [GLOBAL_RULES.md](GLOBAL_RULES.md) completely before every task. It is the
permanent app-wide contract for product behaviour, evidence and money, security,
provider actions, desktop support, design, implementation, and verification.
Apply it to every affected layer, including future features and indirect consumers.

Use [ARCHITECTURE.md](ARCHITECTURE.md) to resolve the domain owners, then read
[PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), and the relevant implementation.
Conflicting repository instructions defer to the global rules unless the owner
explicitly revises them. Reconcile current conflicting documents; historical
plans are evidence, not competing instructions. Do not infer runtime compliance
or release approval from documentation adoption.

The current overhaul plan is
[MERCHANT_CLARITY_IMPLEMENTATION.md](docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md).
Implement only the requested phase or task, preserve unrelated dirty work, and
report actual tests, rendered evidence, and unresolved requirements. No automatic
progression into the next phase or real-system action is implied.

The framework-managed block below remains intact.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
