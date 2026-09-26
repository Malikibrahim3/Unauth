import LossDetailPageContent from './LossDetailPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function LossDetailPage({
  params,
}: {
  params: Promise<{ lossId: string }>;
}) {
  const { lossId } = await params;
  await throwForAcceptanceScenario('loss-detail-error');
  return LossDetailPageContent({ params: Promise.resolve({ id: lossId }) });
}
