import type { IntegrationProvider } from '@/lib/integrations/types';

export const gorgiasProvider: IntegrationProvider = {
  id: 'gorgias',
  name: 'Gorgias',
  logoSrc: '/integrations/gorgias.png',
  category: 'helpdesk',
  authMode: 'api_key',
  buildStatus: 'live',
  description: 'Ticket messages, attachments, and claim context from Gorgias.',
  setupHref: '/settings/integrations/gorgias',
  evidenceCapabilities: [
    'ticket_messages',
    'ticket_attachments',
    'customer_claim_reason',
    'requested_action',
  ],
  capabilities: { readCorrespondence: true, sendCorrespondence: true, readAttachments: true },
  // The historical 11-scenario suite is useful automated/integration evidence,
  // but no artifact identifies a current controlled environment, account, and
  // build for every advertised capability. This therefore derives to Beta.
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'automated_tested', detail: 'API-key connection flow is covered by tests/api/gorgiasSupportConnectionSettings.test.ts; current controlled-account run pending.' },
    { id: 'account_verification', applicability: 'applicable', evidence: 'automated_tested', detail: 'GET /users/me probe logic is covered by tests/api/gorgiasVerifyConnectionRoute.test.ts; current controlled-account run pending.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'automated_tested', detail: 'Ticket backfill is covered by tests/lib/gorgiasBackfill.test.ts; current controlled backfill pending.' },
    { id: 'incremental_pull', applicability: 'applicable', evidence: 'automated_tested', detail: 'Ongoing ticket ingestion is covered by tests/api/gorgiasSupportWebhook.test.ts; controlled provider delivery pending.' },
    { id: 'webhook', applicability: 'applicable', evidence: 'automated_tested', detail: 'Secret checks and idempotent ingestion are covered by tests/api/gorgiasSupportWebhook.test.ts; controlled provider delivery pending.' },
    { id: 'reconciliation', applicability: 'applicable', evidence: 'automated_tested', detail: 'Deleted-ticket reconciliation is covered by tests/lib/shopifyGorgiasProductBridge.test.ts; controlled reconciliation run pending.' },
    { id: 'reconnect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Secret rotation/reconnect is covered by tests/api/gorgiasSupportConnectionSettings.test.ts; controlled reconnect pending.' },
    { id: 'disconnect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Disable and credential removal are covered by tests/api/gorgiasSupportConnectionSettings.test.ts; controlled disconnect pending.' },
    { id: 'freshness_health', applicability: 'applicable', evidence: 'automated_tested', detail: 'Live-probe and freshness logic are covered by tests/api/gorgiasVerifyConnectionRoute.test.ts and catalogue tests; controlled observation pending.' },
    { id: 'bounded_writeback', applicability: 'applicable', evidence: 'automated_tested', detail: 'Internal-note/tag writes are covered with mocked provider responses by tests/lib/gorgiasExecuteAction.test.ts; no controlled provider write was triggered.' },
  ],
};
