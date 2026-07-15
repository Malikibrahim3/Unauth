import type { IntegrationProvider } from '@/lib/integrations/types';

export const zendeskProvider: IntegrationProvider = {
  id: 'zendesk',
  name: 'Zendesk',
  logoSrc: '/integrations/zendesk.svg',
  category: 'helpdesk',
  authMode: 'api_key',
  buildStatus: 'live',
  description: 'Ticket messages, attachments, and payout-case context from Zendesk.',
  setupHref: '/settings/integrations/zendesk',
  evidenceCapabilities: [
    'ticket_messages',
    'ticket_attachments',
    'customer_claim_reason',
    'requested_action',
  ],
  capabilities: { readCorrespondence: true, readAttachments: true },
};
