import { WooCommerceCredentialsError } from '@/lib/commerce/woocommerce/woocommerceConnectionShared';
import type { WooCommerceRestCredentials } from '@/lib/commerce/credentialCrypto';

function basicAuthHeader(credentials: WooCommerceRestCredentials): string {
  const token = Buffer.from(
    `${credentials.consumer_key}:${credentials.consumer_secret}`,
    'utf8',
  ).toString('base64');
  return `Basic ${token}`;
}

export async function validateWooCommerceCredentials(
  storeUrl: string,
  credentials: WooCommerceRestCredentials,
): Promise<void> {
  const url = `${storeUrl.replace(/\/+$/, '')}/wp-json/wc/v3/orders?per_page=1`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: basicAuthHeader(credentials),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
  } catch {
    throw new WooCommerceCredentialsError();
  }

  if (res.status === 401 || res.status === 403) {
    throw new WooCommerceCredentialsError();
  }
  if (!res.ok) {
    throw new WooCommerceCredentialsError();
  }
}

export async function wooCommerceApiFetch(
  storeUrl: string,
  credentials: WooCommerceRestCredentials,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = storeUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${base}${normalizedPath}`, {
    ...init,
    headers: {
      Authorization: basicAuthHeader(credentials),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
}
