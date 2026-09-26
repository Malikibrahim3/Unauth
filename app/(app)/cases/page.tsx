export const dynamic = 'force-dynamic';

import ClaimsPage from './ClaimsPage';
import { delayForAcceptanceScenario, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export default async function CasesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  await delayForAcceptanceScenario('cases-registry-loading', 5_000);
  await throwForAcceptanceScenario('cases-error');
  const incoming = (await searchParams) ?? {};
  return <ClaimsPage searchParams={Promise.resolve({ ...incoming, surface: 'cases' })} />;
}
