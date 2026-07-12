import { Suspense } from 'react';
import ApiIntegrationsClient from '@/components/settings/ApiIntegrationsClient';
import GateActivationChecklist from '@/components/settings/GateActivationChecklist';
import IntegrationHubClient from '@/components/integrations/IntegrationHubClient';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
import { ShopifyOAuthPopupCloser } from '@/components/settings/ShopifyOAuthPopupCloser';
import { IntegrationCentre } from '@/components/integrations/IntegrationCentre';

/**
 * The canonical Integration Centre. Provider-specific setup pages remain under
 * /settings/integrations/* while the settings index redirects here.
 */
export default function IntegrationsPage() {
  return (
    <WorkbenchPage
      eyebrow="Operations"
      title="Integrations"
      subtitle="Connect and monitor the data sources that provide case context, evidence, and recovery signals."
      main={
        <div className="space-y-10">
          <Suspense fallback={null}>
            <ShopifyOAuthPopupCloser />
          </Suspense>
          <GateActivationChecklist />
          <IntegrationCentre />
          <IntegrationHubClient />
          <ApiIntegrationsClient section="advanced" />
        </div>
      }
    />
  );
}
