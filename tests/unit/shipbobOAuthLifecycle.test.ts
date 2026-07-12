import { createHmac } from 'node:crypto';
import { verifyShipBobWebhookSignature } from '@/lib/connectors/providers/shipbob/api';
import {
  createShipBobOAuthState,
  openShipBobOAuthState,
  sealShipBobOAuthState,
  SHIPBOB_READ_SCOPES,
} from '@/lib/integrations/providers/shipbobOAuth';

describe('ShipBob OAuth lifecycle', () => {
  it('requests the read scopes plus webhook subscription permission', () => {
    expect(SHIPBOB_READ_SCOPES).toEqual(expect.arrayContaining([
      'orders_read',
      'fulfillments_read',
      'locations_read',
      'returns_read',
      'webhooks_read',
      'webhooks_write',
      'offline_access',
    ]));
  });

  it('round-trips merchant-bound encrypted OAuth state without relying on a browser cookie', () => {
    const now = Date.parse('2026-07-12T16:00:00.000Z');
    const original = createShipBobOAuthState(true);
    const token = sealShipBobOAuthState({
      oauthState: original,
      merchantId: 'merchant-1',
      userId: 'user-1',
      now,
    });
    expect(token).not.toContain(original.codeVerifier);
    expect(openShipBobOAuthState(token, now + 1_000)).toMatchObject({
      state: original.state,
      codeVerifier: original.codeVerifier,
      sandbox: true,
      merchantId: 'merchant-1',
      userId: 'user-1',
    });
    expect(() => openShipBobOAuthState(token, now + 11 * 60 * 1_000)).toThrow('shipbob_oauth_state_expired');
  });

  it('verifies documented webhook signatures and rejects stale messages', () => {
    const secret = `whsec_${Buffer.from('shipbob-test-secret-123456789012').toString('base64')}`;
    const body = JSON.stringify({ order_id: 'order-1' });
    const id = 'msg_test_1';
    const timestamp = '1700000000';
    const signature = createHmac('sha256', Buffer.from(secret.slice(6), 'base64'))
      .update(`${id}.${timestamp}.${body}`)
      .digest('base64');

    expect(verifyShipBobWebhookSignature({
      rawBody: body,
      secret,
      webhookId: id,
      timestamp,
      signature: `v1,${signature}`,
      nowSeconds: 1700000000,
    })).toBe(true);

    expect(verifyShipBobWebhookSignature({
      rawBody: body,
      secret,
      webhookId: id,
      timestamp,
      signature: `v1,${signature}`,
      nowSeconds: 1700000401,
    })).toBe(false);
  });
});
