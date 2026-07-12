import { SHOPIFY_REST_API_VERSION } from '@/lib/shopify/apiVersion';

const SHOPIFY_COLLECTOR_SRC = 'https://app.unauth.co/collector.js';

type ShopifyScriptTagResponse = {
  script_tag?: {
    id?: number | string;
  };
};

async function createScriptTag(input: {
  shopDomain: string;
  accessToken: string;
  src: string;
}): Promise<string> {
  const response = await fetch(
    `https://${input.shopDomain}/admin/api/${SHOPIFY_REST_API_VERSION}/script_tags.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': input.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: input.src,
        },
      }),
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`shopify_collector_script_tag_failed: ${response.status} ${body.slice(0, 200)}`);
  }

  const payload = (await response.json()) as ShopifyScriptTagResponse;
  const id = payload.script_tag?.id;
  if (id == null) throw new Error('shopify_collector_script_tag_missing_id');
  return String(id);
}

export async function registerShopifyCollectorScriptTags(input: {
  shopDomain: string;
  accessToken: string;
}): Promise<{ collectorScriptTagId: string; initScriptTagId: string }> {
  const collectorScriptTagId = await createScriptTag({
    ...input,
    src: SHOPIFY_COLLECTOR_SRC,
  });
  const initScriptTagId = await createScriptTag({
    ...input,
    src: `https://app.unauth.co/api/shopify/collector-init?shop=${encodeURIComponent(input.shopDomain)}`,
  });

  return { collectorScriptTagId, initScriptTagId };
}
