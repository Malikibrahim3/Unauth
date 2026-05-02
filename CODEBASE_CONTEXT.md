# CODEBASE_CONTEXT

## Product Overview
- **What the product does:** ParcelClaim/Unauth is a CSV-based refund fraud audit tool for ecommerce merchants. Merchants upload an order export, the system scores each transaction, groups orders into customer profiles, and surfaces suspicious refund/INR patterns, identity linkages, and watchlistable customers.
- **Target users:** Fraud analysts, support agents, risk teams, and merchant operators who need to review refunds, validate customer identity, and monitor repeat abuse.
- **Main workflows:**
  - Sign in via Supabase auth.
  - Complete merchant onboarding if the account is new.
  - Upload a CSV, map columns, and run the audit pipeline.
  - Review the audit dashboard, flagged transactions, and linked customer profiles.
  - Use customer lookup, watchlist, feedback, notes, and historical audits for manual review.

## Tech Stack
- **Framework:** Next.js 14 App Router with React 18 and TypeScript.
- **Libraries:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`) for auth/data/storage, PapaParse for streaming CSV ingestion, Zod for schema validation, Lucide icons, Recharts installed, Radix UI primitives installed, `clsx`, `class-variance-authority`, `tailwind-merge`.
- **Styling system:** Tailwind CSS with CSS variables in `app/globals.css` and tokens in `tailwind.config.ts`. Typography uses Inter from `next/font/google`.
- **State management:** Mostly local React state, URL query params, and a small amount of `localStorage` for UI preferences/dismissals. No global state library.
- **Backend/database/auth providers:** Supabase Auth, Supabase Postgres, Supabase Storage bucket `merchant-csv-uploads-2`, and Postgres RPCs for atomic counters, search, feedback, and bulk writes.

## App Structure
### Routing structure
- **Public/auth:** `/login`, `/auth/callback`, and `/` redirecting to `/dashboard`.
- **Authenticated app shell:** Routes under `app/(app)` are protected by the app layout and middleware.
- **Core app routes:** `/dashboard`, `/upload`, `/lookup`, `/customers`, `/watchlist`, `/history`, `/onboarding`, `/help/csv-export`.
- **Audit drilldowns:** `/audit/[runId]`, `/audit/[runId]/customers`, `/audit/[runId]/transaction/[id]`, `/audit/[runId]/customer/[hash]`.
- **API surface:** `/api/audit/*`, `/api/process-csv-job`, `/api/lookup`, `/api/lookup/quick-score`, `/api/fraud-feedback`, `/api/customers/*`, `/api/jobs/[id]/hide`, `/api/transactions/[id]/dismiss`, `/api/watchlist*`, `/api/demo`.

### Layouts
- **Root layout:** `app/layout.tsx` provides global metadata and loads Inter + `app/globals.css`.
- **App shell layout:** `app/(app)/layout.tsx` enforces auth, redirects new users to onboarding, and renders the sidebar plus optional demo banner.
- **Auth screens:** `app/(auth)` routes render outside the main shell and use their own centered layout patterns.

### Page hierarchy
- `/` redirects to `/dashboard`.
- `/dashboard` is the main audit-run index and landing page after login.
- `/upload` is the entry point for a new audit run.
- `/audit/[runId]` is the primary results view; the nested audit routes provide deeper transaction/customer drilldowns.
- `/customers` is the cross-audit customer registry; `/customers/[id]` is the full customer profile view.
- `/lookup` is the live search/quick-score tool for manual checks before refunds.
- `/watchlist` is the monitoring area for starred customers.
- `/history` mirrors the run history listing with a slightly narrower scope than the dashboard.
- `/onboarding` is only shown for new merchants with no prior setup.
- `/help/csv-export` is a static guidance page for improving upload quality.

### Navigation structure
- **Primary nav:** `components/nav/Sidebar.tsx` with Dashboard, New Audit, Lookup, Customers, Watchlist, and History.
- **Top-level contextual navigation:** Breadcrumb links appear on audit/customer detail pages and several drilldowns.
- **Action navigation:** Dashboard and history link to `/upload`; audit pages link to customer lists, exports, and per-transaction details.

## Screens / Pages
### Public / Auth
- **`/`**
  - **Purpose:** Entry redirect to the authenticated dashboard.
  - **Major sections:** None; immediate server redirect.
  - **Components used:** None.
  - **Dependencies:** `next/navigation` redirect.

- **`/login`**
  - **Purpose:** Email/password sign in and sign up.
  - **Major sections:** Branding block, auth form, mode toggle.
  - **Components used:** Native inputs/buttons; Supabase browser client.
  - **Dependencies:** `lib/supabase/client.ts`, Supabase Auth password flows, `useRouter`.

- **`/auth/callback`**
  - **Purpose:** Exchanges the auth code for a session and redirects.
  - **Major sections:** None; route handler only.
  - **Components used:** None.
  - **Dependencies:** `lib/supabase/server.ts`, `exchangeCodeForSession`.

### Shell / Onboarding / Utilities
- **`/onboarding`**
  - **Purpose:** Captures merchant setup details before first use.
  - **Major sections:** Centered card, onboarding form.
  - **Components used:** `components/MerchantSetupForm.tsx`.
  - **Dependencies:** `merchants` table, Supabase auth user, `next/navigation` redirect.

- **`/help/csv-export`**
  - **Purpose:** Static guidance for export enrichment and identity field coverage.
  - **Major sections:** Why more fields matter, field guide, limited-data explanation, back links.
  - **Components used:** Local `FieldRow` subcomponent, `Link`.
  - **Dependencies:** Static content only.

### Core App
- **`/dashboard`**
  - **Purpose:** Audit-run overview and main landing page after login.
  - **Major sections:** Aggregate stat cards, empty-state explainer, runs table.
  - **Components used:** `LoadDemoButton`, `DeleteAuditButton`, `Link`.
  - **Dependencies:** `processing_jobs`, `lib/utils/format.ts`, demo-data state.

- **`/upload`**
  - **Purpose:** Starts a new audit by uploading and mapping a CSV.
  - **Major sections:** Welcome banner, upload header, `UploadClient`.
  - **Components used:** `components/upload/UploadClient.tsx`.
  - **Dependencies:** Supabase Storage, `processing_jobs`, `csv_upload_queue`, merchant defaults.

- **`/lookup`**
  - **Purpose:** Live customer search and read-only quick score for merchants before approving refunds.
  - **Major sections:** Full search form, result cards, quick-score form, quick-score result panel, drawer overlay.
  - **Components used:** `RiskTierBadge`, `CustomerIntelligenceDrawer`, inline `ProfileCard`.
  - **Dependencies:** `/api/lookup`, `/api/lookup/quick-score`, Supabase RPC `search_customer_profiles`, lookup rate limit RPC.

- **`/customers`**
  - **Purpose:** Cross-audit customer registry with advanced filters and pagination.
  - **Major sections:** Header, filter bar, empty state, paginated results table.
  - **Components used:** `CustomersFilterBar`, `CustomersTableClient`.
  - **Dependencies:** `customer_profiles`, URL query params, merchant-scoped auth.

- **`/customers/[id]`**
  - **Purpose:** Full customer profile page for one cross-audit identity.
  - **Major sections:** Breadcrumb, risk overview, behavioral context, order history.
  - **Components used:** `IdentityTimeline`, `WatchlistStarButton`, `CustomerNotes`, `RiskTierBadge`.
  - **Dependencies:** `customer_profiles`, `customer_profile_audit_appearances`, `fraud_transactions`, `buildBehavioralNarrative`.

- **`/watchlist`**
  - **Purpose:** Lists starred customers and recent appearances in audits.
  - **Major sections:** Recent-appearance table, empty-state guidance, all-watchlisted table.
  - **Components used:** `RiskTierBadge`, `RemoveButton`, `WatchlistTableClient`.
  - **Dependencies:** `watchlist_entries`, `customer_profile_audit_appearances`, `processing_jobs`.

- **`/history`**
  - **Purpose:** Simpler audit-run history view.
  - **Major sections:** Header, empty state, runs table.
  - **Components used:** `DeleteAuditButton`, `Link`.
  - **Dependencies:** `processing_jobs`, `formatDate`.

### Audit Views
- **`/audit/[runId]`**
  - **Purpose:** Primary results screen for a specific upload.
  - **Major sections:** Breadcrumb/header, risk legend, data-quality banner, CTA to customer grouping, summary cards, risk-tier counts, flagged transactions table, top customers table.
  - **Components used:** `RiskLegend`, `DataQualityBanner`, `RiskTierBadge`, `DismissTransactionButton`, `FeedbackButtons`, `DeleteAuditButton` export link, `signalLabel`.
  - **Dependencies:** `processing_jobs`, `fraud_transactions`, `DataQualityReport`, `/api/audit/[runId]/export`, `/api/transactions/[id]/dismiss`, `/api/fraud-feedback`.

- **`/audit/[runId]/customers`**
  - **Purpose:** Groups rows from one audit into inferred customer profiles.
  - **Major sections:** Breadcrumb/header, caps warning, summary cards, interactive customer list.
  - **Components used:** `CustomerList`.
  - **Dependencies:** `fraud_transactions`, `buildCustomerProfiles`, `lib/analysis/customerIntelligence.ts`.

- **`/audit/[runId]/transaction/[id]`**
  - **Purpose:** Transaction-level detail page showing scores and fired signals.
  - **Major sections:** Breadcrumb/header, score cards, order details, signal details, recommended action, back links.
  - **Components used:** `RiskTierBadge`, `RecommendedAction`.
  - **Dependencies:** legacy `transactions` table, `signalLabel`, `formatCurrency`, `formatDate`.

- **`/audit/[runId]/customer/[hash]`**
  - **Purpose:** Legacy customer drilldown for an audit, keyed by email hash.
  - **Major sections:** Breadcrumb/header, summary cards, risk tier, order timeline.
  - **Components used:** `RiskTierBadge`.
  - **Dependencies:** legacy `transactions` table, hash-based lookup, order timeline stats.

## Shared Components
### Tables
- `components/audit/CustomerList.tsx` — interactive customer cards with search and filters.
- `components/customers/CustomersTableClient.tsx` — paginated customer registry table with drawer access.
- `components/watchlist/WatchlistTableClient.tsx` — starred customer table with removal actions.
- `components/audit/CustomerProfileCard.tsx` — expandable customer card with embedded order table.
- `components/audit/CustomerNotes.tsx` — note list, not a table but a reusable list/editor in the profile drawer.

### Cards
- `components/audit/CustomerProfileCard.tsx`
- `components/customers/CustomerIntelligenceDrawer.tsx` sections
- `components/common/RiskLegend.tsx` banner card style
- `components/audit/DataQualityBanner.tsx` banner card style
- `components/MerchantSetupForm.tsx` container card pattern
- Multiple page-level stat cards in dashboard, audit, customer pages.

### Forms
- `components/MerchantSetupForm.tsx`
- `components/upload/UploadClient.tsx`
- `components/customers/CustomersFilterBar.tsx`
- `components/audit/CustomerNotes.tsx`
- `app/(auth)/login/page.tsx`
- `app/(app)/lookup/page.tsx` search and quick-score forms

### Buttons
- `components/audit/DeleteAuditButton.tsx`
- `components/audit/DismissTransactionButton.tsx`
- `components/audit/FeedbackButtons.tsx`
- `components/audit/WatchlistStarButton.tsx`
- `components/watchlist/RemoveButton.tsx`
- `components/dashboard/LoadDemoButton.tsx`
- `components/audit/RecommendedAction.tsx` links
- Page-level submit/navigation buttons across upload, login, onboarding, lookup

### Modals / Drawers
- `components/customers/CustomerIntelligenceDrawer.tsx` is the main reusable drawer.
- No dedicated reusable modal primitive was found in the inspected app code.
- Radix Dialog/AlertDialog dependencies are installed but not surfaced as a shared app primitive in the inspected components.

### Filters
- `components/customers/CustomersFilterBar.tsx`
- `components/audit/CustomerList.tsx` local filter bar
- `components/customers/CustomerIntelligenceDrawer.tsx` section toggles

### Charts
- No reusable chart component was found in the inspected UI.
- `recharts` is installed, but the current pages mostly use cards, tables, bars, and badges instead of chart visualizations.

### Badges
- `components/common/RiskTierBadge.tsx`
- `components/common/RiskLegend.tsx`
- Inline watchlist and risk badges in page components and cards
- Data-quality and status pills in audit/upload pages

### Tabs
- No dedicated tab component was found in the inspected codebase.
- `@radix-ui/react-tabs` is installed but not visibly used by the current app screens.

## Data Architecture
### Data fetching patterns
- Server components query Supabase directly via `lib/supabase/server.ts`.
- Client components use `lib/supabase/client.ts` or `fetch` against app routes.
- Long-running upload work is split into a job row plus polling on `processing_jobs`.
- Lookup, watchlist, customer details, and notes use lightweight route handlers for focused reads/writes.
- Several views use `localStorage` for UI preferences or dismissals only, not core data.

### API structure
- `/api/process-csv-job` claims a queued upload, downloads the file from storage, parses it, scores it, and writes results.
- `/api/lookup` and `/api/lookup/quick-score` normalize identity inputs, apply rate limiting, and call service-role RPCs.
- `/api/fraud-feedback` writes merchant feedback into `record_signal_feedback`.
- `/api/audit/[runId]/progress` exposes job status and count telemetry for the upload progress UI.
- `/api/audit/[runId]/export` emits a CSV export of high/critical rows.
- `/api/customers/[id]` returns the customer intelligence panel; `/api/customers/[id]/notes` and `/api/customers/notes/[id]` manage notes.
- `/api/watchlist` and `/api/watchlist/[id]` manage watchlist entries.
- `/api/jobs/[id]/hide` and `/api/transactions/[id]/dismiss` are merchant-scoped update routes.
- `/api/demo` seeds a demo audit from synthetic data.

### Database dependencies
- **Primary tables in current app flow:** `merchants`, `processing_jobs`, `csv_upload_queue`, `fraud_transactions`, `customer_profiles`, `customer_profile_audit_appearances`, `watchlist_entries`, `customer_notes`, `lookup_daily_counts`.
- **Cross-merchant intelligence tables/RPCs:** `fraud_entities`, `fraud_entity_co_occurrences`, `fraud_identity_clusters`, `signal_performance`, `search_customer_profiles`, `search_customer_profiles_batch`, `increment_job_progress`, `increment_lookup_count`.
- **Legacy schema still referenced in some routes/types:** `audit_runs`, `transactions`, `identities`, `identity_signal_links`, `identity_sightings`, `access_audit_log`.

### Auth flows
- Supabase session cookies are managed in middleware and server helpers.
- Middleware protects app routes, allowing `/login`, `/auth/*`, and `/api/*` to proceed without redirecting.
- `/auth/callback` exchanges the OAuth/magic-link code for a session.
- The app layout redirects unauthenticated users to `/login` and first-time users to `/onboarding`.
- Server routes verify ownership by comparing `merchant_id`, `user.id`, and related RLS-scoped tables.

### Permissions / roles
- RLS scopes merchant-owned tables to the authenticated user or the merchant mapped to that user.
- Service role clients are used for server-only operations such as bulk processing, search RPCs, and admin-style writes.
- Cross-merchant profile lookup is intentionally masked and k-anonymity gated in the RPC layer.
- Notes and watchlist are merchant-private; customer_profiles are visible only when the merchant contributed to the profile.

## Technical Constraints
- `processing_jobs` is the authoritative job table for the current upload pipeline, but legacy audit pages still reference `audit_runs` and `transactions`. Avoid a broad schema rewrite without reconciling both paths.
- CSV uploads are capped at 50 MB and 100,000 rows, and the upload UI expects canonical column mapping before submission.
- `lib/identity/normalise.ts` and `lib/identity/hash.ts` are contract-critical: write-side and read-side normalization must stay in sync for matching to work.
- `app/(app)/layout.tsx` onboarding redirect logic depends on `processing_jobs` count and `merchants.setup_complete`.
- `UploadClient` persists the merchant’s default column map back to `merchants.default_column_map`; that behavior is part of the UX contract.
- `processCsvJob` and `app/api/process-csv-job` assume the `merchant-csv-uploads-2` bucket exists and that queue rows are claimed atomically.
- The data-quality banner and lookup rate limiting depend on specific RPCs and table columns being present (`data_quality`, `lookup_daily_counts`, `increment_lookup_count`).
- `CustomerIntelligenceDrawer`, `CustomerProfilePage`, and `API /api/customers/[id]` are tightly coupled; changes to one should be reflected in the others.
- Several views rely on `localStorage` keys for dismissal state (`unauth.riskLegend.dismissed`, `unauth.dqBanner.*`, `unauth.shopifyGuide.open`).

## Design System Entry Points
- **Theme:** `app/globals.css` and `tailwind.config.ts` define the color tokens, borders, radii, and base background/foreground styles.
- **Layout shell:** `app/layout.tsx` and `app/(app)/layout.tsx`.
- **Sidebar:** `components/nav/Sidebar.tsx`.
- **Typography:** `app/layout.tsx` via Inter from `next/font/google`.
- **Spacing:** Tailwind utility classes plus container padding in `tailwind.config.ts`.
- **Colors:** CSS variables in `app/globals.css` and explicit risk colors in `tailwind.config.ts`.
- **Tailwind/config tokens:** `tailwind.config.ts`, `postcss.config.js`, and the CSS variable block in `app/globals.css`.
- **Copy systems:** `lib/copy/riskTiers.ts`, `lib/copy/signalLabels.ts`, and `lib/copy/uploadErrors.ts` control user-facing wording.

## Code Risks
- **Dual data model drift:** The codebase simultaneously supports newer `processing_jobs`/`fraud_transactions` flows and legacy `audit_runs`/`transactions` routes, which can diverge easily.
- **Large coupled components:** `components/upload/UploadClient.tsx`, `components/customers/CustomerIntelligenceDrawer.tsx`, and `lib/analysis/entityResolution.ts` are large and highly stateful.
- **Type assertions and `any` usage:** Many route handlers and data transforms use casts to bridge schema mismatches, which increases the chance of silent breakage.
- **Duplicated UI patterns:** Tables, stat cards, badge layouts, and customer-detail patterns are repeated across pages instead of being centralized.
- **Brittle route assumptions:** Some logic depends on specific headers, hard-coded localStorage keys, and status strings like `completed` vs `complete`.
- **Potentially confusing customer surfaces:** The lookup drawer, full customer page, audit customer list, and watchlist all present overlapping identity data with slightly different scopes.
- **Analytics/tooling mismatch:** `recharts` and some Radix packages are installed, but the current UI mostly uses handcrafted Tailwind layouts, so future additions may need new primitives rather than existing ones.
