export const dynamic = 'force-dynamic';

import SourceConnectionsPage from '../SourceConnectionsPage';

type SourceSearchParams = { view?: string; status?: string; category?: string; layer?: string; q?: string };

export default function ConnectedSourcesPage({ searchParams }: { searchParams: Promise<SourceSearchParams> }) {
  return SourceConnectionsPage({ searchParams, defaultView: 'connected' });
}
