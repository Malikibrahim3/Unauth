import { Suspense } from 'react';
import ApiIntegrationsClient from '@/components/settings/ApiIntegrationsClient';
import IntegrationHubClient from '@/components/integrations/IntegrationHubClient';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
import { ShopifyOAuthPopupCloser } from '@/components/settings/ShopifyOAuthPopupCloser';
import SetupExperience from '@/components/integrations/SetupExperience';

/**
 * The canonical Integration Centre. Provider-specific setup pages remain under
 * /settings/integrations/* while the settings index redirects here.
 */
export default function IntegrationsPage() {
  return (
    <WorkbenchPage
      eyebrow="Operations"
      title="Integrations"
      subtitle="Finish setup, understand what Unauth can automate, and keep every data source healthy."
      main={
        <div className="space-y-10">
          <Suspense fallback={null}>
            <ShopifyOAuthPopupCloser />
          </Suspense>
          <SetupExperience />
          <details id="all-connections" className="group rounded-md border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold">Browse all connection and advanced controls</summary>
            <div className="space-y-8 border-t p-5" style={{ borderColor: 'var(--border-muted)' }}>
              <IntegrationHubClient />
              <ApiIntegrationsClient section="advanced" />
            </div>
          </details>
        </div>
      }
    />
  );
}
