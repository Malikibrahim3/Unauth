import type { IntegrationProvider } from '@/lib/integrations/types';

export const freshdeskProvider: IntegrationProvider = {
  id: 'freshdesk',
  name: 'Freshdesk',
  logoSrc: '/providers/freshdesk.png',
  category: 'helpdesk',
  authMode: 'api_key',
  // Not 'live': no executable adapter, no verify-install route at all, no
  // deleted-ticket reconciliation, and no controlled e2e coverage — unlike
  // Gorgias, the reference implementation for this category. See
  // docs/audits/unauth-mvp-plus/08-provider-proof-matrix.md.
  buildStatus: 'partial',
  description: 'Ticket messages, attachments, and payout-case context from Freshdesk.',
  setupHref: '/sources/setup/freshdesk',
  evidenceCapabilities: [
    'ticket_messages',
    'ticket_attachments',
    'customer_claim_reason',
    'requested_action',
  ],
  capabilities: { readCorrespondence: true, readAttachments: true },
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Credential validation and connection creation are covered by tests/api/freshdeskSupportConnectionSettings.test.ts; controlled account run pending.' },
    { id: 'account_verification', applicability: 'applicable', evidence: 'unavailable', detail: 'Connect-time validation exists, but no ongoing account-identity/health probe is implemented.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'automated_tested', detail: 'Ticket backfill is covered by tests/lib/freshdeskBackfill.test.ts; controlled import pending.' },
    { id: 'incremental_pull', applicability: 'applicable', evidence: 'automated_tested', detail: 'Ongoing webhook ingestion is covered by tests/api/freshdeskSupportWebhook.test.ts; controlled provider delivery pending.' },
    { id: 'webhook', applicability: 'applicable', evidence: 'automated_tested', detail: 'Secret rejection and ingestion are covered by tests/api/freshdeskSupportWebhook.test.ts; controlled delivery pending.' },
    { id: 'reconciliation', applicability: 'applicable', evidence: 'unavailable', detail: 'No deleted-ticket reconciliation job exists.' },
    { id: 'reconnect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Secret rotation is covered by tests/api/freshdeskSupportConnectionSettings.test.ts; controlled reconnect pending.' },
    { id: 'disconnect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Disable and credential clearing are covered by tests/api/freshdeskSupportConnectionSettings.test.ts; controlled disconnect pending.' },
    { id: 'freshness_health', applicability: 'applicable', evidence: 'unavailable', detail: 'Freshdesk is absent from the live-verification health-probe system.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'This catalogue entry advertises read-only support evidence; notes/tags are not offered.' },
  ],
};
