import RuleDetailPageContent from './RuleDetailPage';

export const dynamic = 'force-dynamic';

export default async function RuleDetailPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = await params;
  return RuleDetailPageContent({ params: Promise.resolve({ id: ruleId }) });
}
