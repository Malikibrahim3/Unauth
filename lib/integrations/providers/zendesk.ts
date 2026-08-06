import type { IntegrationProvider } from '@/lib/integrations/types';

export const zendeskProvider: IntegrationProvider = {
  id: 'zendesk',
  name: 'Zendesk',
  logoSrc: '/providers/zendesk.svg',
  category: 'helpdesk',
  authMode: 'api_key',
  // Not 'live': no executable adapter, no real health probe (verify-install
  // writes status:'active' without calling Zendesk), no deleted-ticket
  // reconciliation, and no controlled e2e coverage — unlike Gorgias, the
  // reference implementation for this category. See
  // docs/audits/unauth-mvp-plus/08-provider-proof-matrix.md.
  buildStatus: 'partial',
  description: 'Ticket messages, attachments, and payout-case context from Zendesk.',
  setupHref: '/sources/setup/zendesk',
  evidenceCapabilities: [
    'ticket_messages',
    'ticket_attachments',
    'customer_claim_reason',
    'requested_action',
  ],
  capabilities: { readCorrespondence: true, readAttachments: true },
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'implemented', detail: 'Dedicated API-key connection routes are implemented; no controlled Zendesk account run is recorded.' },
    { id: 'account_verification', applicability: 'applicable', evidence: 'unavailable', detail: 'The verify-install route writes connected status without calling Zendesk; no real account probe exists.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'automated_tested', detail: 'Ticket backfill is covered by tests/lib/zendeskBackfill.test.ts; controlled import pending.' },
    { id: 'incremental_pull', applicability: 'applicable', evidence: 'automated_tested', detail: 'Ongoing webhook ingestion is covered by tests/api/zendeskSupportWebhook.test.ts; controlled provider delivery pending.' },
    { id: 'webhook', applicability: 'applicable', evidence: 'automated_tested', detail: 'Secret rejection, ingestion, and deduplication are covered by tests/api/zendeskSupportWebhook.test.ts; controlled delivery pending.' },
    { id: 'reconciliation', applicability: 'applicable', evidence: 'unavailable', detail: 'No deleted-ticket reconciliation job exists.' },
    { id: 'reconnect', applicability: 'applicable', evidence: 'implemented', detail: 'Connection settings support reconnecting; no controlled reconnect run exists.' },
    { id: 'disconnect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Helpdesk disconnect routing is covered by tests/unit/connectors/disconnect.test.ts; controlled disconnect pending.' },
    { id: 'freshness_health', applicability: 'applicable', evidence: 'unavailable', detail: 'Zendesk is absent from the live-verification health-probe system.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'This catalogue entry advertises read-only support evidence; notes/tags are not offered.' },
  ],
};
