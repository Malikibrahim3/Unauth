import { OperationalCaseDemo } from '@/components/demo/OperationalCaseDemo';

export const metadata = {
  title: 'Case walkthrough | Unauth',
  description: 'Walk through a synthetic Unauth payout case from evidence to merchant decision and recovery handoff.',
};

export default function DemoPage() {
  return <OperationalCaseDemo />;
}
