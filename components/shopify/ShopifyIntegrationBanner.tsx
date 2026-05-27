'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const SHOPIFY_ERROR_MESSAGES: Record<string, string> = {
  public_domain:
    'That looks like a public website address. Use your Shopify Admin URL (for example admin.shopify.com/store/your-store).',
  invalid_shop:
    'We could not recognise that as a Shopify store. Try admin.shopify.com/store/your-store or your-store.myshopify.com.',
  misconfigured: 'Shopify integration is not configured on this environment. Contact support.',
  install_failed: 'Could not start Shopify authorization. Please try again.',
  missing_params: 'Shopify authorization was incomplete. Please try connecting again.',
  invalid_state: 'Your Shopify authorization session expired. Please try connecting again.',
  invalid_hmac: 'Shopify authorization could not be verified. Please try connecting again.',
  token_exchange_failed: 'Could not complete Shopify authorization. Please try connecting again.',
  missing_merchant:
    'Shopify authorized the store but we could not link it to your account. Sign in and connect again.',
  connection_failed: 'Could not save your Shopify connection. Please try again.',
  callback_failed: 'Something went wrong finishing Shopify setup. Please try again.',
};

export default function ShopifyIntegrationBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState<'success' | 'error' | 'warning'>('success');

  useEffect(() => {
    const connected = searchParams.get('shopify_connected') === '1';
    const shop = searchParams.get('shop');
    const errorCode = searchParams.get('shopify_error');
    const warning = searchParams.get('shopify_warning');

    if (connected) {
      const domain = shop ?? 'your store';
      let text = `Shopify connected: ${domain}`;
      if (warning === 'backfill_failed') {
        text += '. Connection saved, but initial order sync did not complete — try Reconnect if orders are missing.';
        setVariant('warning');
      } else if (warning === 'webhook_registration_failed') {
        text += '. Connection saved, but live webhooks may not be registered — try Reconnect.';
        setVariant('warning');
      } else {
        setVariant('success');
      }
      setMessage(text);
      setVisible(true);
    } else if (errorCode) {
      setMessage(SHOPIFY_ERROR_MESSAGES[errorCode] ?? 'Could not connect Shopify. Please try again.');
      setVariant('error');
      setVisible(true);
    } else {
      setVisible(false);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('shopify_connected');
    url.searchParams.delete('shop');
    url.searchParams.delete('shopify_error');
    url.searchParams.delete('shopify_warning');
    router.replace(url.pathname + (url.search || ''), { scroll: false });
  }, [searchParams, router]);

  if (!visible) return null;

  const styles =
    variant === 'success'
      ? { background: 'var(--success-bg, #DCFCE7)', color: 'var(--success, #166534)', border: 'var(--success-bd, #BBF7D0)' }
      : variant === 'warning'
        ? { background: 'var(--risk-medium-bg, #FEF3C7)', color: 'var(--risk-medium, #92400E)', border: 'var(--risk-medium-bd, #FDE68A)' }
        : { background: 'var(--risk-high-bg, #FEE2E2)', color: 'var(--risk-high, #991B1B)', border: 'var(--risk-high-bd, #FCA5A5)' };

  return (
    <div
      className="rounded-lg border px-4 py-3 text-sm mb-4"
      style={styles}
      role="status"
      data-testid="shopify-integration-banner"
    >
      {message}
    </div>
  );
}
