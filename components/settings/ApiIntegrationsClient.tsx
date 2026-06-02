'use client';

import ApiIntegrationsAdvancedSection from '@/components/settings/ApiIntegrationsAdvancedSection';
import ApiIntegrationsHelpdeskSection from '@/components/settings/ApiIntegrationsHelpdeskSection';

export default function ApiIntegrationsClient({
  section = 'advanced',
}: {
  section?: 'helpdesk' | 'advanced';
}) {
  if (section === 'helpdesk') {
    return <ApiIntegrationsHelpdeskSection />;
  }
  return <ApiIntegrationsAdvancedSection />;
}
