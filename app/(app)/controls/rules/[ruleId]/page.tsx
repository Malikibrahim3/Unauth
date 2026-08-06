import LegacyRuleDetailPage from '@/app/(app)/rules/[id]/page';

export const dynamic = 'force-dynamic';

export default async function RuleDetailPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = await params;
  return LegacyRuleDetailPage({ params: Promise.resolve({ id: ruleId }) });
}
