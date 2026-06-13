import { bigCommerceApiFetch } from '@/lib/commerce/bigcommerce/bigcommerceApi';

const COLLECTOR_SRC = 'https://app.unauth.co/collector.js';
const INGEST_ENDPOINT = 'https://app.unauth.co/api/checkout-signals/ingest';

export async function registerBigCommerceCollectorScript(input: {
  storeHash: string;
  accessToken: string;
  merchantId: string;
}): Promise<string> {
  const html =
    `<script src="${COLLECTOR_SRC}" defer></script>` +
    `<script>document.addEventListener('DOMContentLoaded',function(){window.UnauthCollector&&window.UnauthCollector.init({merchantId:${JSON.stringify(input.merchantId)},platform:"bigcommerce",endpoint:${JSON.stringify(INGEST_ENDPOINT)}});});</script>`;

  const response = await bigCommerceApiFetch(
    input.storeHash,
    input.accessToken,
    '/v3/content/scripts',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Unauth Collector',
        description: 'Unauth fraud intelligence signal collection',
        html,
        location: 'footer',
        visibility: 'all_pages',
        kind: 'script_tag',
        consent_category: 'functional',
        enabled: true,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`bigcommerce_collector_script_failed: ${response.status} ${text.slice(0, 200)}`);
  }

  const payload = (await response.json()) as { data?: { uuid?: string } };
  const uuid = payload.data?.uuid;
  if (!uuid) throw new Error('bigcommerce_collector_script_missing_uuid');
  return uuid;
}

export async function deleteBigCommerceCollectorScript(input: {
  storeHash: string;
  accessToken: string;
  scriptUuid: string;
}): Promise<void> {
  const response = await bigCommerceApiFetch(
    input.storeHash,
    input.accessToken,
    `/v3/content/scripts/${encodeURIComponent(input.scriptUuid)}`,
    { method: 'DELETE' }
  );
  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => '');
    throw new Error(`bigcommerce_collector_script_delete_failed: ${response.status} ${text.slice(0, 200)}`);
  }
}
