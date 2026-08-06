import LegacyFlowDetailPage from '@/app/(app)/flows/[id]/page';

export const dynamic = 'force-dynamic';

export default async function FlowDetailPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = await params;
  return LegacyFlowDetailPage({ params: Promise.resolve({ id: flowId }) });
}
