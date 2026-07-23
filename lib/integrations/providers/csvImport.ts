import type { IntegrationProvider } from '@/lib/integrations/types';

export const csvImportProvider: IntegrationProvider = {
  id: 'csv_import',
  name: 'CSV / manual import',
  logoSrc: '/integrations/document-upload.svg',
  category: 'commerce',
  authMode: 'manual_upload',
  buildStatus: 'live',
  description: 'Merchant-uploaded customers, orders, refunds, and fulfillment records.',
  setupHref: '/integrations/imports',
  evidenceCapabilities: [
    'order_value',
    'line_items',
    'customer_history',
    'refund_history',
    'tracking_number',
  ],
  capabilities: { readOrders: true, readRefunds: true, readFulfilment: true },
  // First-party does not mean runtime-verified. Local route tests exercise
  // validation/canonical mapping, but no isolated DB-backed workflow was
  // available for this build, so this derives to Partial.
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'implemented', detail: 'The merchant import page and authenticated validate/commit routes are implemented; controlled application run pending.' },
    { id: 'account_verification', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No external account to verify.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'automated_tested', detail: 'Validation, preview, row-level errors, duplicate handling, canonical order/customer upsert, provenance, and idempotency-key construction are covered by tests/lib/canonicalCsvMapping.test.ts and canonicalCsvCommit.test.ts. Refund rows are currently reported unsupported; no isolated DB-backed correction/retry workflow was run.' },
    { id: 'incremental_pull', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Each upload is a discrete merchant action, not an ongoing pull.' },
    { id: 'webhook', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No external system sends events.' },
    { id: 'reconciliation', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No external source exists to reconcile.' },
    { id: 'reconnect', applicability: 'not_applicable', evidence: 'unavailable', detail: 'There is no persistent external connection.' },
    { id: 'disconnect', applicability: 'not_applicable', evidence: 'unavailable', detail: 'There is no persistent external connection.' },
    { id: 'freshness_health', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Freshness is the upload timestamp, not a probed connection.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Import is one-directional into Unauth.' },
  ],
};
