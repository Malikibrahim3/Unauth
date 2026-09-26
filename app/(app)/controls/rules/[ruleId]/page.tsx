import RuleDetailPageContent from './RuleDetailPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function RuleDetailPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  await throwForAcceptanceScenario('rule-detail-error');
  const { ruleId } = await params;
  return RuleDetailPageContent({ params: Promise.resolve({ id: ruleId }) });
}
