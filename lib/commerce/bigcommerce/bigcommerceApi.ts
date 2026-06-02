import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { bigCommerceApiBaseUrl } from '@/lib/commerce/bigcommerce/bigcommerceConnectionShared';

export async function bigCommerceApiFetch(
  storeHash: string,
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = bigCommerceApiBaseUrl(storeHash);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${base}${normalizedPath}`, {
    ...init,
    headers: {
      'X-Auth-Token': accessToken,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
}

export async function loadBigCommerceAccessToken(
  credentialsEncrypted: string,
): Promise<string> {
  const credentials = decryptBigCommerceOAuthCredentials(credentialsEncrypted);
  return credentials.access_token;
}

export async function fetchBigCommerceOrder(input: {
  storeHash: string;
  accessToken: string;
  orderId: number | string;
}): Promise<Record<string, unknown> | null> {
  const res = await bigCommerceApiFetch(
    input.storeHash,
    input.accessToken,
    `/v2/orders/${input.orderId}`,
  );
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

export async function fetchBigCommerceRefund(input: {
  storeHash: string;
  accessToken: string;
  orderId: number | string;
  refundId: number | string;
}): Promise<Record<string, unknown> | null> {
  const res = await bigCommerceApiFetch(
    input.storeHash,
    input.accessToken,
    `/v3/orders/${input.orderId}/payment_actions/refunds/${input.refundId}`,
  );
  if (res.ok) {
    const payload = (await res.json()) as { data?: Record<string, unknown> };
    return payload.data ?? null;
  }

  const legacy = await bigCommerceApiFetch(
    input.storeHash,
    input.accessToken,
    `/v2/orders/${input.orderId}/refunds/${input.refundId}`,
  );
  if (!legacy.ok) return null;
  return (await legacy.json()) as Record<string, unknown>;
}
