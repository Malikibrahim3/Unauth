import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';
import { ControlsNav } from '@/components/rules/ControlsNav';

export default function RuleNotFound() {
  return <PageFrame title="Rule not found" subtitle="This rule is unavailable in the current workspace." tabs={<ControlsNav />} surfaceId="rule-version-workbench" archetype="P8"><Surface structure="working" as="section"><div data-state-id="rule-not-found"><EmptyState title="Rule not found" description="It may have been archived or belong to another workspace. No recommendation policy was changed." action={<ButtonLink href="/controls/rules" variant="secondary">Return to rules</ButtonLink>} /></div></Surface></PageFrame>;
}
