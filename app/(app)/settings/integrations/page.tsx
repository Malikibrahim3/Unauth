import { Suspense } from 'react';
import ShopifyIntegrationBanner from '@/components/shopify/ShopifyIntegrationBanner';
import OrderSourceClient from '@/components/settings/OrderSourceClient';
import ApiIntegrationsClient from '@/components/settings/ApiIntegrationsClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Integrations"
        subtitle="Unauth needs two live sources: an order platform for transaction data, and a helpdesk for claims and dispute context."
        breadcrumbs={[
          { label: 'Settings', href: '/settings/account' },
          { label: 'Integrations' },
        ]}
      />

      <div className="p-6 lg:p-8 max-w-5xl space-y-8">
        {/* Required data pair - order source on the left, helpdesk on the right */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Required sources
            </h2>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
              style={{
                background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
                color: 'var(--warning)',
              }}
            >
              Both needed
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Connect both to monitor live orders and tie every claim back to real purchase history.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Order source - ecommerce platform */}
            <div className="space-y-2.5">
              <Suspense fallback={null}>
                <ShopifyIntegrationBanner />
              </Suspense>
              <OrderSourceClient />
            </div>

            {/* Helpdesk - claims & dispute context */}
            <ApiIntegrationsClient section="helpdesk" />
          </div>
        </section>

        {/* Advanced - lower priority tooling */}
        <ApiIntegrationsClient section="advanced" />
      </div>
    </div>
  );
}
