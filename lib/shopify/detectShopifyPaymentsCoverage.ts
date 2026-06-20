const SHOPIFY_GRAPHQL_API_VERSION = '2026-01';

export type ShopifyPaymentsCoverage = 'covered' | 'not_covered' | 'unknown';

export async function detectShopifyPaymentsCoverage(input: {
  shopDomain: string;
  accessToken: string;
}): Promise<ShopifyPaymentsCoverage> {
  const query = `
    query UnauthShopifyPaymentsAccount {
      shopifyPaymentsAccount {
        activated
      }
    }
  `;

  try {
    const res = await fetch(`https://${input.shopDomain}/admin/api/${SHOPIFY_GRAPHQL_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': input.accessToken,
      },
      body: JSON.stringify({ query }),
      cache: 'no-store',
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.errors) {
      return 'unknown';
    }

    const account = body?.data?.shopifyPaymentsAccount;
    if (!account) return 'not_covered';
    if (account.activated === true) return 'covered';
    if (account.activated === false) return 'not_covered';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
