'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShopifyIntegrationBannerInner } from '@/components/shopify/ShopifyIntegrationBannerInner';

function ShopifyIntegrationBannerContent() {
  const searchParams = useSearchParams();
  return <ShopifyIntegrationBannerInner search={searchParams.toString()} />;
}

export default function ShopifyIntegrationBanner() {
  return (
    <Suspense fallback={null}>
      <ShopifyIntegrationBannerContent />
    </Suspense>
  );
}
