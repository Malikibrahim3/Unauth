import CustomerEvidenceLoading from './loading';
import { EvidenceNewPageContent } from './EvidenceNewPageClient';
import {
  acceptanceScenarioFromHeaders,
  acceptanceVariantFromHeaders,
  throwForAcceptanceScenario,
} from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function EvidenceNewPage({ params }: { params: Promise<{ id: string }> }) {
  const scenario = await acceptanceScenarioFromHeaders();
  if (scenario === 'evidence-package-builder-loading') return <CustomerEvidenceLoading />;
  await throwForAcceptanceScenario('evidence-package-error');
  const acceptanceState = await acceptanceVariantFromHeaders(
    'evidence-package-no-orders-no-cases-states',
    ['no-orders', 'no-cases'] as const,
  );
  const { id } = await params;
  return <EvidenceNewPageContent profileId={id} acceptanceState={acceptanceState} />;
}
