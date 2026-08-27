import RecoveryDetailPageContent from './RecoveryDetailPage';

export const dynamic = 'force-dynamic';

export default async function RecoveryDetailPage({
  params,
}: {
  params: Promise<{ recoveryId: string }>;
}) {
  const { recoveryId } = await params;
  return RecoveryDetailPageContent({ params: Promise.resolve({ id: recoveryId }) });
}
