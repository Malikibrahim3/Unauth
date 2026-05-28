import { Plug } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import SyncStatusCard from '@/components/shopify/SyncStatusCard';
import ShopifyIntegrationBanner from '@/components/shopify/ShopifyIntegrationBanner';

export default function IntegrationsPage() {
  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs mb-4 hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Settings
        </Link>
        <div className="flex items-center gap-3">
          <Plug className="h-5 w-5" style={{ color: 'var(--icon-muted)' }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Integrations</h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Connected platforms and data sources.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Gorgias</h2>
        <div
          className="mb-8 flex items-center justify-between gap-4 rounded-lg border p-4"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Unauth Fraud Intelligence
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Available now — show risk scores in the Gorgias ticket sidebar via HTTP integration.
            </p>
          </div>
          <Link
            href="/settings/integrations/gorgias"
            className="shrink-0 rounded-md px-3 py-2 text-xs font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
          >
            Connect
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Shopify</h2>
        <Suspense fallback={null}>
          <ShopifyIntegrationBanner />
        </Suspense>
        <SyncStatusCard />
      </div>
    </div>
  );
}
