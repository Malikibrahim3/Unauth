import FlowRunDetailPageContent from './FlowRunDetailPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function FlowRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  await throwForAcceptanceScenario('flow-run-error');
  const { runId } = await params;
  return FlowRunDetailPageContent({ params: Promise.resolve({ id: runId }) });
}
