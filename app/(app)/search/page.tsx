import { PageFrame } from '@/components/ui';
import { WorkspaceSearch } from '@/components/search/WorkspaceSearch';
import { getRequestPermissions } from '@/lib/auth/requestContext';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams?: Promise<{ q?: string; type?: string; source?: string; cursor?: string }> }) {
  const [params, permissions] = await Promise.all([searchParams, getRequestPermissions()]);
  const query = (params?.q ?? '').trim().slice(0, 120);
  return (
    <PageFrame
      title="Search"
      breadcrumbs={[{ label: 'Unauth', href: '/overview' }, { label: 'Search' }]}
      showCurrentBreadcrumb
      surfaceId="search-route"
      archetype="P5"
    >
      <WorkspaceSearch
        key={`${query}|${params?.type ?? ''}|${params?.source ?? ''}|${params?.cursor ?? ''}`}
        initialQuery={query}
        initialType={params?.type}
        initialSource={params?.source}
        initialCursor={params?.cursor ?? null}
        permissions={permissions}
      />
    </PageFrame>
  );
}
