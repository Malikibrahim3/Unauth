import LegacyRunDetailPage from '@/app/(app)/flows/runs/[id]/page';

export const dynamic = 'force-dynamic';

export default async function FlowRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  return LegacyRunDetailPage({ params: Promise.resolve({ id: runId }) });
}
