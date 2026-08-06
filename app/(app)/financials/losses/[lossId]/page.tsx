import LegacyLossDetailPage from '@/app/(app)/losses/[id]/page';

export const dynamic = 'force-dynamic';

export default async function LossDetailPage({
  params,
}: {
  params: Promise<{ lossId: string }>;
}) {
  const { lossId } = await params;
  return LegacyLossDetailPage({ params: Promise.resolve({ id: lossId }) });
}
