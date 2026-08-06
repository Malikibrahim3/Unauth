import FlowRunDetailPageContent from './FlowRunDetailPage';

export const dynamic = 'force-dynamic';

export default async function FlowRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  return FlowRunDetailPageContent({ params: Promise.resolve({ id: runId }) });
}
