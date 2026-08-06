# P00 Architecture Decision Register

**PROVISIONAL — NOT CERTIFICATION EVIDENCE**

All decisions are accountable to `Engineering / requesting_repository_controller / PROVISIONAL`, use observed repository facts, permit implementation continuation only, and require ratified re-review before P12. No entry authorises deployment, production mutation, paid resources or a stack replacement.

## ADR-P00-001 — Repository and package boundaries

- Question: Which tree and packages define the product?
- Facts/evidence: Git root at `c9aecf4`; root Next app; Chrome, Shopify and Zendesk extensions; Supabase migrations. See repository map.
- Options: root as system of record; create a new monorepo; choose another workspace.
- Decision/status: Preserve the observed root and package boundaries; `SPEC_AUTHORISED_PROVISIONAL_CONTINUATION`.
- Consequence: no parallel framework; package-specific builds remain explicit.

## ADR-P00-002 — Rendering and hydration

- Question: Which rendering architecture should later UI use?
- Facts/evidence: Next.js 16 App Router with server components and explicit client components is established.
- Options: preserve App Router; replace with SPA; add another rendering framework.
- Decision/status: Preserve App Router/server-first conventions; provisional.
- Consequence: later phases may add client islands only where interaction requires them.

## ADR-P00-003 — Contract generation

- Question: How should generated contracts cross server/client boundaries?
- Facts/evidence: TypeScript/Zod contracts exist but are fragmented; no single generated financial source.
- Options: TypeScript/Zod generator in repository; hand-written duplicates; external schema service.
- Decision/status: Use repository TypeScript plus runtime decoders and deterministic generated output; P02 owns authoritative generator. P00 slice proves shape only.
- Consequence: duplicates and route-authored financial contracts remain a recorded P02 gap.

## ADR-P00-004 — Decimal and FX handling

- Question: What money representation is authorised?
- Facts/evidence: current code predominantly uses integer minor units but legacy `number` paths and no v1.1 exact-decimal/FX generator remain.
- Options: preserve legacy numbers; arbitrary precision decimal strings with half-even conversion; binary floats.
- Decision/status: P02 must implement the specification's lossless-decimal and per-input half-even rules. P00 makes no financial change.
- Consequence: legacy meaning cannot cross a v2 boundary without P02 proof.

## ADR-P00-005 — Permission enforcement

- Question: Where is authority enforced?
- Facts/evidence: `lib/permissions`, route guards, Supabase RLS and audit helpers exist.
- Options: server/RLS enforcement; client-only hiding; new external authorisation service.
- Decision/status: Preserve server/RLS fail-closed enforcement; client visibility is supplementary. P02 hardens capability/version/segregation.
- Consequence: no client-inferred authority.

## ADR-P00-006 — Chart strategy

- Question: Which chart implementation should P03 use?
- Facts/evidence: Recharts 3.10.1 and authenticated chart code are installed; v1.1 requires closed V01–V08 contracts.
- Options: adapt Recharts behind closed variants; replace library; arbitrary route charts.
- Decision/status: Adapt existing Recharts only behind P03 closed variants, subject to P01/P02 evidence; provisional.
- Consequence: no new dependency or arbitrary route configuration in P00.

## ADR-P00-007 — Table strategy

- Question: Which table foundation should later phases consolidate?
- Facts/evidence: shared `DataTable`/`DataTableServer` plus legacy table patterns exist.
- Options: consolidate shared repository tables; install grid service; keep route forks.
- Decision/status: Consolidate existing shared table primitives in P03/P05; provisional.
- Consequence: large-row virtualisation remains P05 proof, not P00 work.

## ADR-P00-008 — Testing and visual evidence

- Question: What is the repository-native evidence mechanism?
- Facts/evidence: Jest/Testing Library, Playwright and custom evidence scripts exist; Storybook absent.
- Options: use existing stack; add Storybook; external visual service.
- Decision/status: Use Jest and Playwright/evidence scripts; record Storybook `NOT_PRESENT`; provisional.
- Consequence: P00 uses a deterministic DOM regression; certification renders remain P01/P03/P12 obligations.

## ADR-P00-009 — Feature flags and certification lock

- Question: How are flags governed before P04?
- Facts/evidence: validated environment flags and some direct reads exist; no v1.1 typed generation/certification lock implementation.
- Options: current environment flags plus signed governance lock; new service; client flags.
- Decision/status: Preserve current server environment mechanism; `owners-approvals.yaml` controls lock ON until P04 implements a server/release fail-closed lock.
- Consequence: P12–P14 and production v2 cohort changes remain prohibited.

## ADR-P00-010 — Observability

- Question: Which telemetry path is used?
- Facts/evidence: Amplitude, Sentry dependency, `lib/observability`, audit/outbox and route telemetry exist.
- Options: preserve/redact current paths; install new vendor; console-only.
- Decision/status: Preserve current observability and audit boundaries with redacted identifiers; no new vendor.
- Consequence: P00 slice emits only event, contract version and synthetic trace ID.

## ADR-P00-011 — Deployment and environments

- Question: What deployment command/environment is authorised?
- Facts/evidence: Vercel metadata exists; no repository deploy command; production access not authorised.
- Options: external Vercel workflow; add CLI deployment; another platform.
- Decision/status: Deployment mechanism `NOT_PRESENT` in repository and external/locked. Local and configured non-production environments only until ratified Release authority.
- Consequence: P00 does not deploy; later deployment needs separate authority.

## ADR-P00-012 — Migration and secret storage

- Question: Which migration and secret boundaries apply?
- Facts/evidence: forward Supabase migrations and verification scripts are established; encrypted production secret-manager ownership is not ratified.
- Options: preserve forward migrations and externally ratify secret manager; mutate applied migrations; store application plaintext.
- Decision/status: Preserve forward-only migrations; prohibit production/schema mutation in P00; secret-manager choice is `P00-DEFER-003`.
- Consequence: P10 cannot add credential persistence until Security/Privacy and Platform/SRE ratify the server-side manager.
