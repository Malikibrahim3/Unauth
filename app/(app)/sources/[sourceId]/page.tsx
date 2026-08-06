import SourceDetailPageContent from './SourceDetailPage';

export const dynamic = 'force-dynamic';

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  return SourceDetailPageContent({ params: Promise.resolve({ provider: sourceId }) });
}
