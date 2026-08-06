import SourceConnectionsPage from '../SourceConnectionsPage';

export const dynamic = 'force-dynamic';

export default function BrowseSourcesPage() {
  return SourceConnectionsPage({ searchParams: Promise.resolve({ view: 'browse' }) });
}
