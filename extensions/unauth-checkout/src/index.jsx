import { useEffect, useRef } from 'react';
import {
  reactExtension,
  useApplyAttributeChange,
  useBuyerIdentity,
  useEmail,
  useShop,
} from '@shopify/ui-extensions-react/checkout';
import { sha256 } from './sha256';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <UnauthSignalCollector />
);

function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

function randomId() {
  try {
    if (crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function getOrCreateVisitorId() {
  let visitorId = getCookie('_unauth_vid');
  if (!visitorId) {
    visitorId = randomId();
    try {
      visitorId = sessionStorage.getItem('_unauth_vid_ext') || visitorId;
    } catch {}
  }
  try {
    sessionStorage.setItem('_unauth_vid_ext', visitorId);
  } catch {}
  return visitorId;
}

function UnauthSignalCollector() {
  const email = useEmail();
  const shop = useShop();
  const buyer = useBuyerIdentity();
  const applyAttribute = useApplyAttributeChange();
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const visitorId = getOrCreateVisitorId();
    const sessionId = randomId();
    const emailHash = email ? sha256(email.toLowerCase().trim()) : null;
    const accountType = buyer?.customer ? 'registered' : 'guest';
    const shopifyDomain = shop?.myshopifyDomain || shop?.storefrontUrl || '';

    applyAttribute({
      type: 'updateAttribute',
      key: '_unauth_vid',
      value: visitorId,
    }).catch(() => {});

    const payload = {
      eventId: randomId(),
      merchantId: shopifyDomain,
      shopifyDomain,
      visitorId,
      sessionId,
      deviceFp: null,
      emailHash,
      accountType,
      platform: 'shopify',
      page: '/checkout',
      referrer: null,
      checkoutReached: true,
      cartCount: null,
      eventType: 'checkout',
      ts: Date.now(),
    };

    const configUrl =
      'https://app.unauth.co/api/checkout-signals/config?platform=shopify&store=' +
      encodeURIComponent(shopifyDomain.toLowerCase());
    fetch(configUrl, { method: 'GET', credentials: 'omit' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('collector_config_failed')))
      .then((collectorConfig) => fetch(collectorConfig.endpoint || 'https://app.unauth.co/api/checkout-signals/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          merchantId: collectorConfig.merchantId,
          collectorToken: collectorConfig.collectorToken,
        }),
      }))
      .catch(() => {});
  }, [applyAttribute, buyer, email, shop]);

  return null;
}
