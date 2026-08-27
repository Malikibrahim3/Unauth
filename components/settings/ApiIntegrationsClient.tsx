'use client';

import ApiIntegrationsAdvancedSection from '@/components/settings/ApiIntegrationsAdvancedSection';
import ApiIntegrationsHelpdeskSection from '@/components/settings/ApiIntegrationsHelpdeskSection';

export default function ApiIntegrationsClient({
  section = 'advanced',
  machineAccessEnabled,
}: {
  section?: 'helpdesk' | 'advanced';
  machineAccessEnabled: boolean;
}) {
  if (section === 'helpdesk') {
    return <ApiIntegrationsHelpdeskSection />;
  }
  return <ApiIntegrationsAdvancedSection machineAccessEnabled={machineAccessEnabled} />;
}
