import { WorkspaceSearch } from '@/components/search/WorkspaceSearch';
import { getRequestPermissions } from '@/lib/auth/requestContext';
import { delayForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams?: Promise<{ q?: string; type?: string; source?: string; cursor?: string }> }) {
  await delayForAcceptanceScenario('authenticated-route-loading-shell');
  const [params, permissions] = await Promise.all([searchParams, getRequestPermissions()]);
  const query = (params?.q ?? '').trim().slice(0, 120);
  return <WorkspaceSearch
    key={`${query}|${params?.type ?? ''}|${params?.source ?? ''}|${params?.cursor ?? ''}`}
    initialQuery={query}
    initialType={params?.type}
    initialSource={params?.source}
    initialCursor={params?.cursor ?? null}
    permissions={permissions}
  />;
}
