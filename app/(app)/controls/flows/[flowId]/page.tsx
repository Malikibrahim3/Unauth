import FlowDetailPageContent from './FlowDetailPage';

export const dynamic = 'force-dynamic';

export default async function FlowDetailPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = await params;
  return FlowDetailPageContent({ params: Promise.resolve({ id: flowId }) });
}
