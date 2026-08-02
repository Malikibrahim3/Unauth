import { OperationalCaseDemo } from '@/components/demo/OperationalCaseDemo';
import { isDemoCaseStep } from '@/lib/demo/merchantCaseV1';

export const metadata = {
  title: 'Case walkthrough | Unauth',
  description: 'Walk through a synthetic Unauth case from evidence to merchant decision and recovery handoff.',
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { step } = await searchParams;
  return <OperationalCaseDemo initialStep={isDemoCaseStep(step) ? step : 'incoming'} />;
}
