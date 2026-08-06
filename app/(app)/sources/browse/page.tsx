import LegacyIntegrationsPage from '@/app/(app)/integrations/page';

export const dynamic = 'force-dynamic';

export default function BrowseSourcesPage() {
  return LegacyIntegrationsPage({ searchParams: Promise.resolve({ view: 'browse' }) });
}
