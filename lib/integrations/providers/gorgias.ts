import type { IntegrationProvider } from '@/lib/integrations/types';

export const gorgiasProvider: IntegrationProvider = {
  id: 'gorgias',
  name: 'Gorgias',
  category: 'helpdesk',
  authMode: 'api_key',
  buildStatus: 'live',
  description: 'Ticket messages, attachments, and claim context from Gorgias.',
  evidenceCapabilities: [
    'read_correspondence',
    'ticket_messages',
    'ticket_attachments',
    'customer_claim_reason',
    'requested_action',
    'customer_correspondence',
    'customer_claim_message',
  ],
  capabilities: { readCorrespondence: true, sendCorrespondence: true, readAttachments: true },
};
