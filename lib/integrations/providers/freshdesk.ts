import type { IntegrationProvider } from '@/lib/integrations/types';

export const freshdeskProvider: IntegrationProvider = {
  id: 'freshdesk',
  name: 'Freshdesk',
  logoSrc: '/integrations/freshdesk.png',
  category: 'helpdesk',
  authMode: 'api_key',
  buildStatus: 'live',
  description: 'Ticket messages, attachments, and payout-case context from Freshdesk.',
  setupHref: '/settings/integrations/freshdesk',
  evidenceCapabilities: [
    'ticket_messages',
    'ticket_attachments',
    'customer_claim_reason',
    'requested_action',
  ],
  capabilities: { readCorrespondence: true, readAttachments: true },
};
