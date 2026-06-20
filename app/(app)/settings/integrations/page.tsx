import { Suspense } from 'react';
import IntegrationsSetupClient from '@/components/settings/IntegrationsSetupClient';
import ApiIntegrationsClient from '@/components/settings/ApiIntegrationsClient';
import IntegrationHubClient from '@/components/integrations/IntegrationHubClient';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
import { ShopifyOAuthPopupCloser } from '@/components/settings/ShopifyOAuthPopupCloser';

export default function IntegrationsPage() {
  return (
    <WorkbenchPage
      eyebrow="Settings"
      title="Integrations"
      subtitle="Connect one order source and one helpdesk to enable payout control inside support tickets."
      main={
        <div className="space-y-10">
          <Suspense fallback={null}>
            <ShopifyOAuthPopupCloser />
          </Suspense>
          <IntegrationHubClient />
          <IntegrationsSetupClient />
          <ApiIntegrationsClient section="advanced" />
        </div>
      }
    />
  );
}
