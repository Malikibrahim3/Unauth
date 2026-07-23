jest.mock('@/lib/commerce/processedWebhookHandler', () => ({
  claimProcessedWebhook: jest.fn(),
}));

import { claimProcessedWebhook } from '@/lib/commerce/processedWebhookHandler';
import {
  claimSupportTicketDelivery,
  replayedSupportResult,
} from '@/lib/support/webhookEventSafety';

describe('helpdesk delivery ordering and replay safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (claimProcessedWebhook as jest.Mock).mockResolvedValue({ status: 'claimed' });
  });

  it('scopes a hydrated ticket version by merchant and provider connection', async () => {
    const updatedAt = '2026-07-22T10:00:00.000Z';
    await claimSupportTicketDelivery({} as any, {
      provider: 'zendesk',
      merchantId: 'merchant-a',
      providerConnectionId: 'connection-a',
      eventType: 'ticket_updated',
      ticket: { id: 42, updated_at: updatedAt, status: 'open' },
    });

    expect(claimProcessedWebhook).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      platform: 'zendesk',
      storeKey: 'merchant-a:connection-a',
      nativeWebhookId: `ticket_updated:42:${Date.parse(updatedAt)}`,
      objectKey: 'ticket:42',
      eventVersion: Date.parse(updatedAt),
    }));
  });

  it('uses the hydrated snapshot hash when a provider supplies no timestamp', async () => {
    await claimSupportTicketDelivery({} as any, {
      provider: 'gorgias',
      merchantId: 'merchant-a',
      providerConnectionId: null,
      eventType: 'ticket_created',
      ticket: { id: 'g-1', status: 'open' },
    });

    expect(claimProcessedWebhook).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      storeKey: 'merchant-a:merchant',
      nativeWebhookId: expect.stringMatching(/^ticket_created:g-1:[a-f0-9]{64}$/),
      objectKey: null,
      eventVersion: null,
    }));
  });

  it('accepts only a complete stored support result for replay', () => {
    const valid = { ok: true, merchant_id: 'merchant-a', external_case_id: '42' };
    expect(replayedSupportResult(valid)).toBe(valid);
    expect(replayedSupportResult({ ok: true, external_case_id: '42' })).toBeNull();
    expect(replayedSupportResult(null)).toBeNull();
  });
});
