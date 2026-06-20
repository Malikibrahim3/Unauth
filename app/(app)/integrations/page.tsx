import IntegrationHubClient from '@/components/integrations/IntegrationHubClient';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';

export default function IntegrationsHubPage() {
  return (
    <WorkbenchPage
      eyebrow="Settings"
      title="Integrations"
      subtitle="Connect evidence sources for payout cases and see provider slots available on request."
      main={<IntegrationHubClient />}
    />
  );
}
