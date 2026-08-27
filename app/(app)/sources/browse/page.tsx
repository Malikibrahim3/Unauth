import SourceConnectionsPage from '../SourceConnectionsPage';

export const dynamic = 'force-dynamic';

type SourceSearchParams = { status?: string; category?: string; layer?: string; q?: string };

export default async function BrowseSourcesPage({ searchParams }: { searchParams: Promise<SourceSearchParams> }) {
  const resolved = await searchParams;
  return SourceConnectionsPage({ searchParams: Promise.resolve({ ...resolved, view: 'browse' }), defaultView: 'browse' });
}
