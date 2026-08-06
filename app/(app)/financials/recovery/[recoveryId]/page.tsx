import LegacyRecoveryDetailPage from '@/app/(app)/recoveries/[id]/page';

export const dynamic = 'force-dynamic';

export default async function RecoveryDetailPage({
  params,
}: {
  params: Promise<{ recoveryId: string }>;
}) {
  const { recoveryId } = await params;
  return LegacyRecoveryDetailPage({ params: Promise.resolve({ id: recoveryId }) });
}
