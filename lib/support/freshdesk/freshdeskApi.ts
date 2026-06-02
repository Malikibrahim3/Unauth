import { FreshdeskCredentialsError } from '@/lib/support/freshdesk/supportConnectionShared';

export class FreshdeskApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'FreshdeskApiError';
  }
}

export function freshdeskApiBaseUrl(providerBaseUrl: string): string {
  return `${providerBaseUrl.replace(/\/$/, '')}/api/v2`;
}

function basicAuthHeader(apiKey: string): string {
  const token = Buffer.from(`${apiKey.trim()}:X`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

export async function freshdeskApiRequest<T>(
  providerBaseUrl: string,
  path: string,
  apiKey: string,
  init?: RequestInit
): Promise<T> {
  const apiBase = freshdeskApiBaseUrl(providerBaseUrl);
  const url = `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: basicAuthHeader(apiKey),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new FreshdeskCredentialsError('freshdesk_credentials_invalid');
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new FreshdeskApiError(res.status, detail || `freshdesk_api_${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function validateFreshdeskApiCredentials(
  providerBaseUrl: string,
  apiKey: string
): Promise<void> {
  await freshdeskApiRequest<{ tickets?: unknown[] }>(
    providerBaseUrl,
    '/tickets?per_page=1',
    apiKey
  );
}

export async function fetchFreshdeskTicketById(input: {
  providerBaseUrl: string;
  apiKey: string;
  ticketId: string;
}): Promise<Record<string, unknown>> {
  return freshdeskApiRequest<Record<string, unknown>>(
    input.providerBaseUrl,
    `/tickets/${encodeURIComponent(input.ticketId)}`,
    input.apiKey,
    { method: 'GET' }
  );
}
