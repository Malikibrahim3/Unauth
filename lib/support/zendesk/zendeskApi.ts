import { ZendeskCredentialsError } from '@/lib/support/zendesk/supportConnectionShared';
import type { ZendeskApiCredentials } from '@/lib/support/zendesk/credentialCrypto';
import { zendeskBaseUrlFromSubdomain } from '@/lib/support/zendesk/accountIdentity';

export class ZendeskApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ZendeskApiError';
  }
}

export function zendeskApiBaseUrl(providerBaseUrl: string): string {
  return `${providerBaseUrl.replace(/\/$/, '')}/api/v2`;
}

function basicAuthHeader(credentials: ZendeskApiCredentials): string {
  const token = Buffer.from(
    `${credentials.email}/token:${credentials.api_token}`,
    'utf8',
  ).toString('base64');
  return `Basic ${token}`;
}

export async function zendeskApiRequest<T>(
  providerBaseUrl: string,
  pathOrUrl: string,
  credentials: ZendeskApiCredentials,
  init?: RequestInit,
): Promise<T> {
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${zendeskApiBaseUrl(providerBaseUrl)}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: basicAuthHeader(credentials),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 403) {
    throw new ZendeskCredentialsError('zendesk_credentials_invalid');
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ZendeskApiError(res.status, detail.slice(0, 500) || `zendesk_api_${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function validateZendeskApiCredentials(
  subdomain: string,
  credentials: ZendeskApiCredentials,
): Promise<void> {
  const baseUrl = zendeskBaseUrlFromSubdomain(subdomain);
  await zendeskApiRequest<{ user?: { id?: number } }>(
    baseUrl,
    '/users/me.json',
    credentials,
  );
}
