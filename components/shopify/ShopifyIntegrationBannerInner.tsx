'use client';

import { useEffect, useMemo } from 'react';

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
  token_exchange_failed: 'Could not complete Shopify authorization. Please try again.',
  missing_merchant:
    'Shopify authorized the store but we could not link it to your account. Sign in and connect again.',
  connection_failed: 'Could not save your Shopify connection. Please try again.',
  callback_failed: 'Something went wrong finishing Shopify setup. Please try again.',
};

const BANNER_VARIANT_STYLES = {
  success: {
    background: 'var(--success-bg, #DCFCE7)',
    color: 'var(--success, #166534)',
    border: 'var(--success-bd, #BBF7D0)',
  },
  warning: {
    background: 'var(--risk-medium-bg, #FEF3C7)',
    color: 'var(--risk-medium, #92400E)',
    border: 'var(--risk-medium-bd, #FDE68A)',
  },
  error: {
    background: 'var(--risk-high-bg, #FEE2E2)',
    color: 'var(--risk-high, #991B1B)',
    border: 'var(--risk-high-bd, #FCA5A5)',
  },
} as const;

export function ShopifyIntegrationBannerInner({ search }: { search: string }) {
  const banner = useMemo(() => {
    const params = new URLSearchParams(search);
    const connected = params.get('shopify_connected') === '1';
    const shop = params.get('shop');
    const errorCode = params.get('shopify_error');
    const warning = params.get('shopify_warning');

    if (connected) {
      const domain = shop ?? 'your store';
      let text = `Shopify connected: ${domain}`;
      let variant: 'success' | 'error' | 'warning' = 'success';
      if (warning === 'backfill_failed') {
        text += '. Connection saved, but initial order sync did not complete - try Reconnect if orders are missing.';
        variant = 'warning';
      } else if (warning === 'webhook_registration_failed') {
        text += '. Connection saved, but live webhooks may not be registered - try Reconnect.';
        variant = 'warning';
      }
      return { visible: true, message: text, variant };
    }

    if (errorCode) {
      return {
        visible: true,
        message: SHOPIFY_ERROR_MESSAGES[errorCode] ?? 'Could not connect Shopify. Please try again.',
        variant: 'error' as const,
      };
    }

    return null;
  }, [search]);

  useEffect(() => {
    if (!banner || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('shopify_connected');
    url.searchParams.delete('shop');
    url.searchParams.delete('shopify_error');
    url.searchParams.delete('shopify_warning');
    const next = url.pathname + (url.search || '');
    window.history.replaceState(window.history.state, '', next);
  }, [banner]);

  if (!banner) return null;

  return (
    <output
      className="block rounded-lg border px-4 py-3 text-sm mb-4"
      style={BANNER_VARIANT_STYLES[banner.variant]}
      data-testid="shopify-integration-banner"
    >
      {banner.message}
    </output>
  );
}
