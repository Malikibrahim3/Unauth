# UX Flow Map

Evidence source: `reports/deployment-readiness/UX_PLAYWRIGHT_EVIDENCE.json`.

## Auth

- `/login`: simple email/password page. Copy is neutral and product-specific.
- Authenticated app redirects to `/dashboard`.

## Dashboard

- Primary CTA: `New Audit`.
- Shows latest audit, transaction volume, match rate, evidence packages, charts.
- Risk: "customers to review / all resolved" is useful, but dashboard mixes confidence, review, and "match rate" concepts without a visible glossary.

## Upload

1. `/upload` empty state: dropzone, template download, export guidance.
2. Mapping: required and optional field mappings; advanced CSV signals; data-quality warning.
3. Context: label, date range, upload type.
4. Processing: polls `/api/audit/[runId]/progress`.
5. Completion: redirects to `/audit/[runId]`.

Observed issue: frontend copy says `Max 50 MB · up to 100,000 rows`, while backend stream parser allows 5,000,000 rows and API constant is 500 MB.

## Audit Result

- `/audit/[runId]`: overview, customers, transactions, data quality.
- CTAs: review matched profiles, export report, view transactions.
- Observed issue: top action copy said 9 orders across 2 customers while tab said `Customers (82)`. Needs clearer distinction between all customers, customers with signals, profiles, and confirmed identities.

## Customer Investigation

- Audit result has an inline audit customer drawer.
- Global customers use separate customer list/profile routes.
- Full profile exists at `/customers/[id]`.
- There are at least three customer investigation surfaces. This is the biggest UX consistency problem.

Recommended target:
- Audit rows open one canonical `CustomerProfileDrawer`.
- Drawer has "Open full profile" preserving audit context.
- Full profile is the single deep investigation workspace.

## Watchlist

- Empty state is clear and action-oriented.
- Needs end-to-end test of adding/removing a customer and appearance after future audit.

## Evidence Packages

- `/chargebacks` is the evidence-package area.
- Empty state is understandable, but nav/page label "Chargebacks" narrows the broader review/evidence positioning.

## Settings/Privacy

- Account, team, audit trail, legal/privacy pages exist.
- Danger zone copy is direct and serious.

## Dead Ends / Confusing Transitions

- Clicking the first global customer row in Playwright did not visibly change page state; "View" link is clearer than row-level click.
- Audit customer drawer and full profile do not feel like one coherent workspace.
- Customer drawer/profile use "risk" language in several places instead of identity confidence/review priority.

