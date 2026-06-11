import { Suspense } from 'react';
import ShopifyIntegrationBanner from '@/components/shopify/ShopifyIntegrationBanner';
import IntegrationsSetupClient from '@/components/settings/IntegrationsSetupClient';
import ApiIntegrationsClient from '@/components/settings/ApiIntegrationsClient';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';

function ShopifyBannerSkeleton() {
  return (
    <div
      className="rounded-[10px] border p-4 flex gap-3 animate-pulse"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      aria-hidden="true"
    >
      <div className="h-8 w-8 rounded-[6px] shrink-0" style={{ background: 'var(--border)' }} />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-4 w-32 rounded-[4px]" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-56 rounded-[4px]" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <WorkbenchPage
      eyebrow="Settings"
      title="Integrations"
      subtitle="Connect your order source and helpdesk to enable live claim intelligence. Two sources required: one commerce platform, one helpdesk."
      main={
        <div className="space-y-8">
          <Suspense fallback={<ShopifyBannerSkeleton />}>
            <ShopifyIntegrationBanner />
          </Suspense>
          <IntegrationsSetupClient />
          <ApiIntegrationsClient section="advanced" />
        </div>
      }
    />
  );
}
