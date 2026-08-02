'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShopifyIntegrationBannerInner } from '@/components/shopify/ShopifyIntegrationBannerInner';
import { Bone } from '@/components/ui';

function ShopifyIntegrationBannerContent() {
  const searchParams = useSearchParams();
  return <ShopifyIntegrationBannerInner search={searchParams.toString()} />;
}

export default function ShopifyIntegrationBanner() {
  return (
    <Suspense
      fallback={(
        <div aria-busy="true" aria-label="Loading Shopify connection result">
          <Bone className="mb-4 h-12 w-full" />
        </div>
      )}
    >
      <ShopifyIntegrationBannerContent />
    </Suspense>
  );
}
