import { Suspense } from 'react';
import ShopifyIntegrationBanner from '@/components/shopify/ShopifyIntegrationBanner';
import IntegrationsSetupClient from '@/components/settings/IntegrationsSetupClient';
import ApiIntegrationsClient from '@/components/settings/ApiIntegrationsClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Integrations"
        subtitle="Gorgias-native claim intelligence for Shopify merchants."
        breadcrumbs={[
          { label: 'Settings', href: '/settings/account' },
          { label: 'Integrations' },
        ]}
      />

      <div className="p-6 lg:p-8 max-w-3xl space-y-8">
        <Suspense fallback={null}>
          <ShopifyIntegrationBanner />
        </Suspense>

        <IntegrationsSetupClient />

        <ApiIntegrationsClient section="advanced" />
      </div>
    </div>
  );
}
