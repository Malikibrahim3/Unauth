import SourceDetailPageContent from './SourceDetailPage';

export const dynamic = 'force-dynamic';

export default async function SourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { sourceId } = await params;
  return SourceDetailPageContent({ params: Promise.resolve({ provider: sourceId }), searchParams });
}
