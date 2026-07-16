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
};
