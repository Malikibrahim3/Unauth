import { Suspense } from 'react';
import ApiIntegrationsClient from '@/components/settings/ApiIntegrationsClient';
import GateActivationChecklist from '@/components/settings/GateActivationChecklist';
import IntegrationHubClient from '@/components/integrations/IntegrationHubClient';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
import { ShopifyOAuthPopupCloser } from '@/components/settings/ShopifyOAuthPopupCloser';

export default function IntegrationsPage() {
  return (
    <WorkbenchPage
      eyebrow="Settings"
      title="Integrations"
      subtitle="Connect your data sources to give Unauth the context it needs to control payouts and build evidence."
      main={
        <div className="space-y-10">
          <Suspense fallback={null}>
            <ShopifyOAuthPopupCloser />
          </Suspense>
          <GateActivationChecklist />
          <IntegrationHubClient />
          <ApiIntegrationsClient section="advanced" />
        </div>
      }
    />
  );
}
