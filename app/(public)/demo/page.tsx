import { OperationalCaseDemo } from '@/components/demo/OperationalCaseDemo';
import { delayForAcceptanceScenario, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';
export const metadata = { title: 'Three sample cases | Unauth', description: 'Inspect fictional evidence, review a simulated merchant decision and advance separate sample outcomes.' };
export default async function DemoPage() {
  await delayForAcceptanceScenario('demo-loading');
  await throwForAcceptanceScenario('demo-error');
  return <OperationalCaseDemo />;
}
