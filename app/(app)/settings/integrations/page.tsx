import { Plug } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import SyncStatusCard from '@/components/shopify/SyncStatusCard';
import ShopifyIntegrationBanner from '@/components/shopify/ShopifyIntegrationBanner';
import ApiIntegrationsClient from '@/components/settings/ApiIntegrationsClient';

export default function IntegrationsPage() {
  return (
    <div className="space-y-8 p-8 max-w-2xl">
      <div>
        <Link
          href="/settings/account"
          className="mb-4 inline-flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Settings
        </Link>
        <div className="flex items-center gap-3">
          <Plug className="h-5 w-5" style={{ color: 'var(--icon-muted)' }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Integrations</h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect your store, helpdesk, and browser tools. Manage API keys for custom integrations.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>Shopify</h2>
        <Suspense fallback={null}>
          <ShopifyIntegrationBanner />
        </Suspense>
        <div className="mt-3">
          <SyncStatusCard />
        </div>
      </div>

      <ApiIntegrationsClient />
    </div>
  );
}
