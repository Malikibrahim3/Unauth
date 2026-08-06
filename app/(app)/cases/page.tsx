export const dynamic = 'force-dynamic';

import ClaimsPage from '@/app/(app)/claims/page';

export default async function CasesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const incoming = (await searchParams) ?? {};
  return <ClaimsPage searchParams={Promise.resolve({ ...incoming, surface: 'cases' })} />;
}
