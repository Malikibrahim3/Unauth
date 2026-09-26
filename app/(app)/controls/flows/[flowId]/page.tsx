import FlowDetailPageContent from './FlowDetailPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function FlowDetailPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  await throwForAcceptanceScenario('flow-detail-error');
  const { flowId } = await params;
  return FlowDetailPageContent({ params: Promise.resolve({ id: flowId }) });
}
