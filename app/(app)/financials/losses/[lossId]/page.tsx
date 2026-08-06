import LossDetailPageContent from './LossDetailPage';

export const dynamic = 'force-dynamic';

export default async function LossDetailPage({
  params,
}: {
  params: Promise<{ lossId: string }>;
}) {
  const { lossId } = await params;
  return LossDetailPageContent({ params: Promise.resolve({ id: lossId }) });
}
