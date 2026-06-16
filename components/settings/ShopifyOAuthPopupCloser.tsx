'use client';

import { useEffect } from 'react';

/**
 * Drop this onto the integrations page. When Shopify OAuth completes in a popup
 * window, the popup lands back here. This component detects window.opener, posts
 * the result to the parent, then closes the popup.
 *
 * Has no effect when the page is loaded normally (not in a popup).
 */
export function ShopifyOAuthPopupCloser() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.opener) return;

    const shopifyError = new URLSearchParams(window.location.search).get('shopify_error');

    try {
      (window.opener as Window).postMessage(
        {
          type: 'shopify_oauth_complete',
          success: !shopifyError,
          error: shopifyError ?? null,
        },
        window.location.origin,
      );
    } catch {
      // opener may be gone
    }

    const t = setTimeout(() => window.close(), 150);
    return () => clearTimeout(t);
  }, []);

  return null;
}
