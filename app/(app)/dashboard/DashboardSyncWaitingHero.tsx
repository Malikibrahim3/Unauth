import Link from 'next/link';
import { ShoppingBag, Headphones, Loader2 } from 'lucide-react';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { PanelCard } from '@/components/ui';
import { capitalize } from '@/app/(app)/dashboard/dashboardPageUtils';
import { DashboardSyncRow } from '@/app/(app)/dashboard/DashboardSyncRow';

export function DashboardSyncWaitingHero({ connection }: { connection: ConnectionState }) {
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="font-semibold mb-1.5" style={{ fontSize: 20, color: 'var(--text-primary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          Your sources are connected. Waiting for synced data.
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          Shopify and your helpdesk are both connected. We&apos;re waiting for the first customer, order, and claim data to
          sync. This usually completes within a few minutes of the first webhook.
        </p>
      </div>
      <PanelCard variant="app" className="space-y-3 p-5">
        <DashboardSyncRow
          label={
            connection.orderSourcePlatform === 'woocommerce'
              ? 'WooCommerce'
              : connection.orderSourcePlatform === 'bigcommerce'
                ? 'BigCommerce'
                : 'Shopify'
          }
          connected={connection.orderSourceConnected}
          icon={ShoppingBag}
        />
        <DashboardSyncRow
          label={connection.helpdeskProvider ? capitalize(connection.helpdeskProvider) : 'Helpdesk'}
          connected={connection.helpdesk}
          icon={Headphones}
        />
        <div className="flex items-center gap-2 pt-1 text-caption" style={{ color: 'var(--text-tertiary)' }}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Waiting for first sync…
        </div>
      </PanelCard>
      <div className="flex items-center gap-3">
        <Link href="/settings/integrations" className="btn-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold">
          Check sync status
        </Link>
      </div>
    </div>
  );
}
