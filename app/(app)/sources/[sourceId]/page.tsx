import LegacyConnectionPage from '@/app/(app)/integrations/[provider]/page';

export const dynamic = 'force-dynamic';

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  return LegacyConnectionPage({ params: Promise.resolve({ provider: sourceId }) });
}
