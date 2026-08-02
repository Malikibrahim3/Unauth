import { PageFrame } from '@/components/ui';
import { HelpCentre } from '@/components/help/HelpCentre';

export default function HelpIndexPage() {
  return (
    <PageFrame
      title="Help"
      subtitle="Search practical guidance for reviewing cases, configuring rules, and following recoveries."
    >
      <HelpCentre />
    </PageFrame>
  );
}
