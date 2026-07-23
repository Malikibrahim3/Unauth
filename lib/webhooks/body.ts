export const DEFAULT_WEBHOOK_BODY_LIMIT_BYTES = 1024 * 1024;

export class WebhookBodyError extends Error {
  constructor(
    public readonly status: 400 | 413,
    public readonly code: 'invalid_body' | 'payload_too_large',
  ) {
    super(code);
    this.name = 'WebhookBodyError';
  }
}

/** Read a request body without ever buffering more than the configured limit. */
export async function readBoundedRequestBytes(
  request: Request,
  maxBytes = DEFAULT_WEBHOOK_BODY_LIMIT_BYTES,
): Promise<Uint8Array> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new WebhookBodyError(413, 'payload_too_large');
    }
  }

  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('payload_too_large').catch(() => undefined);
        throw new WebhookBodyError(413, 'payload_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

/**
 * Read a webhook body without ever buffering more than the configured limit.
 * The returned text is the exact UTF-8 representation used for signature
 * verification and must be verified before JSON parsing.
 */
export async function readBoundedWebhookBody(
  request: Request,
  maxBytes = DEFAULT_WEBHOOK_BODY_LIMIT_BYTES,
): Promise<string> {
  const bytes = await readBoundedRequestBytes(request, maxBytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new WebhookBodyError(400, 'invalid_body');
  }
}
