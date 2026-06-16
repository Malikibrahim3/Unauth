import { Suspense } from 'react';
import IntegrationsSetupClient from '@/components/settings/IntegrationsSetupClient';
import ApiIntegrationsClient from '@/components/settings/ApiIntegrationsClient';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
import { ShopifyOAuthPopupCloser } from '@/components/settings/ShopifyOAuthPopupCloser';

export default function IntegrationsPage() {
  return (
    <WorkbenchPage
      eyebrow="Settings"
      title="Integrations"
      subtitle="Connect one order source and one helpdesk to enable claim intelligence inside support tickets."
      main={
        <div className="space-y-10">
          <Suspense fallback={null}>
            <ShopifyOAuthPopupCloser />
          </Suspense>
          <IntegrationsSetupClient />
          <ApiIntegrationsClient section="advanced" />
        </div>
      }
    />
  );
}
