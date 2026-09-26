import { HelpCentre } from '@/components/help/HelpCentre';
import { ExactHelpCentre } from '@/components/help/ExactHelpCentre';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export default async function HelpIndexPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  await throwForAcceptanceScenario('help-error');
  const resolvedSearchParams = await searchParams;
  const query = (resolvedSearchParams?.q ?? '').trim().slice(0, 100);
  return query ? <HelpCentre initialQuery={query} /> : <ExactHelpCentre />;
}
