import { readBoundedWebhookBody, WebhookBodyError } from '@/lib/webhooks/body';

describe('readBoundedWebhookBody', () => {
  it('preserves the exact bounded UTF-8 body used for signature verification', async () => {
    const raw = '{\n  "message": "café",\n  "count": 2\n}\n';
    const request = new Request('https://example.test/webhook', {
      method: 'POST',
      body: raw,
    });

    await expect(readBoundedWebhookBody(request, 128)).resolves.toBe(raw);
  });

  it('rejects an oversized declared content length before reading the stream', async () => {
    const request = new Request('https://example.test/webhook', {
      method: 'POST',
      headers: { 'content-length': '129' },
      body: 'small',
    });

    await expect(readBoundedWebhookBody(request, 128)).rejects.toMatchObject<Partial<WebhookBodyError>>({
      status: 413,
      code: 'payload_too_large',
    });
  });

  it('stops a chunked body as soon as it exceeds the byte limit', async () => {
    const request = new Request('https://example.test/webhook', {
      method: 'POST',
      body: 'ééé',
    });

    await expect(readBoundedWebhookBody(request, 5)).rejects.toMatchObject<Partial<WebhookBodyError>>({
      status: 413,
      code: 'payload_too_large',
    });
  });

  it('rejects invalid UTF-8 rather than altering the signed representation', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0xc3, 0x28]));
        controller.close();
      },
    });
    const request = new Request('https://example.test/webhook', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    await expect(readBoundedWebhookBody(request, 16)).rejects.toMatchObject<Partial<WebhookBodyError>>({
      status: 400,
      code: 'invalid_body',
    });
  });
});
