# Unauth

Unauth is a source-agnostic evidence reconciliation, decision-support, and recovery-control platform for ecommerce merchants.

It brings commerce, helpdesk, fulfillment, payment, and manually imported records into one merchant-scoped operational model. Unauth reconciles identities, events, and money; gives the merchant separate customer-action, responsibility, and recovery recommendations; observes the outcome the merchant actually took; and tracks provider credits through reconciliation. The merchant always controls the outcome.

The signed-in product is organized around **Overview**, **Work**, **Cases**, **Losses**, **Recovery**, **Customers**, **Rules and Flows**, **Reports**, **Integrations**, and **Settings**. Provider-specific integrations feed the same cases, records, timeline, and financial ledger; no provider defines the product model.

Unauth does not ask AI to guess who is at fault. APIs show what systems recorded, not always what was physically inside a parcel. When the evidence is incomplete, Unauth says **responsibility unresolved** and requests the exact missing artifact.

## Local development

Requirements: Node.js 22, npm, and a Supabase project.

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Fill in the required values documented in `.env.local.example`. Apply the ordered migrations in `supabase/migrations/` with the Supabase CLI or your normal deployment process. Never edit an already-applied migration; add a new forward migration.

## Validation

```bash
npm run typecheck
npm run lint
npm run lint:authenticated-design
npm test -- --runInBand
npm run build
```

Browser tests require an isolated non-production environment and explicit test credentials. See [`docs/TESTING.md`](docs/TESTING.md).

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system boundaries and canonical contracts
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — product model and terminology
- [`docs/CONNECTORS.md`](docs/CONNECTORS.md) — provider capabilities and lifecycle
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — environments, migrations, deployment, and rollback
- [`docs/SECURITY.md`](docs/SECURITY.md) — security invariants and outstanding rotations
- [`docs/TESTING.md`](docs/TESTING.md) — local, integration, and browser validation

The authenticated design system lives in [`styles/authenticated/README.md`](styles/authenticated/README.md).
