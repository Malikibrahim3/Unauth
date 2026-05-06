# Component Duplication Report

## Duplicated Customer Surfaces

1. `components/customers/CustomerDrawer.tsx`
   - Marked as canonical in comments.
   - Uses shared UI kit and `useCustomerIntelligence`.

2. `components/customers/CustomerIntelligenceDrawer.tsx`
   - Older roadmap drawer.
   - Has its own skeletons, stat tiles, roadmap cards, status handling, watchlist, notes.

3. `components/audit/AuditCustomersTableClient.tsx`
   - Contains inline `AuditCustomerDrawer`.
   - Fetches `/api/audit/[runId]/customer?email=...`.
   - Auto-upgrades to `CustomerIntelligenceDrawer` if persistent profile ID exists.

4. `app/(app)/customers/[id]/page.tsx`
   - Full customer profile reimplements roadmap, dossier, identity details, timeline, linked identities.

Impact: inconsistent labels, confidence mapping, actions, data scopes, loading/error states, and investigation flow.

Recommended fix: one `CustomerProfileDrawer`, one `CustomerFullProfile`, shared `CustomerInvestigationModel`.

## Duplicated Shared UI

- `components/common/PageHeader.tsx` and `components/ui/PageHeader.tsx`.
- `components/common/EmptyState.tsx` and `components/ui/EmptyState.tsx`.
- `components/common/Button.tsx` and `components/ui/Button.tsx`.
- Risk/confidence display split across `components/ConfidenceGrade.tsx`, `components/ui/ConfidenceBadge.tsx`, `components/ui/RiskScoreBadge.tsx`, `components/ConfidenceGrade.tsx`, and risk helpers.

Recommended fix: keep `components/ui/*` as the product UI kit and migrate route-level code away from `components/common/*` unless intentionally distinct.

## Duplicated Data Calculations

- Audit summary: `lib/analysis/auditSummary.ts`, audit page local aggregation, dashboard summaries.
- Customer transaction/profile timelines: `app/api/customers/[id]/route.ts`, `app/(app)/customers/[id]/page.tsx`, `CustomerIntelligenceDrawer`.
- Identity grade mapping: `riskLevelToNewGrade`, `legacyGradeToNew`, `scoreToGrade`, scorer thresholds.

Recommended fix: central domain helpers:
- `IdentityConfidenceBadge`
- `EvidenceSignalsList`
- `LinkedIdentityList`
- `AuditSummaryCards`
- `TransactionTable`
- `FilterBar`
- `LoadingState`
- `EmptyState`

