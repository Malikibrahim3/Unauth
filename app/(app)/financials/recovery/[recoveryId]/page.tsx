import RecoveryDetailPageContent from './RecoveryDetailPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function RecoveryDetailPage({
  params,
}: {
  params: Promise<{ recoveryId: string }>;
}) {
  const { recoveryId } = await params;
  await throwForAcceptanceScenario('recovery-detail-error');
  return RecoveryDetailPageContent({ params: Promise.resolve({ id: recoveryId }) });
}
