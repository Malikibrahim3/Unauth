import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';
import { ControlsNav } from '@/components/rules/ControlsNav';

export default function FlowNotFound() {
  return <PageFrame title="Flow not found" subtitle="This flow version is unavailable in the current workspace." tabs={<ControlsNav />} surfaceId="flow-version-workbench" archetype="P8"><Surface structure="working" as="section"><div data-state-id="flow-not-found"><EmptyState title="Flow not found" description="It may have been retired or belong to another workspace. No automation state was changed." action={<ButtonLink href="/controls/flows" variant="secondary">Return to flows</ButtonLink>} /></div></Surface></PageFrame>;
}
