export const dynamic = 'force-dynamic';

import ClaimsPage from './ClaimsPage';

export default async function CasesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const incoming = (await searchParams) ?? {};
  return <ClaimsPage searchParams={Promise.resolve({ ...incoming, surface: 'cases' })} />;
}
