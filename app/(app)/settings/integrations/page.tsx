import { Plug } from 'lucide-react';
import Link from 'next/link';
import SyncStatusCard from '@/components/shopify/SyncStatusCard';

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
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Shopify</h2>
        <SyncStatusCard />
      </div>
    </div>
  );
}
