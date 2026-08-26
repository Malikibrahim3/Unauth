import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';
import { ControlsNav } from '@/components/rules/ControlsNav';

export default function FlowRunNotFound() {
  return <PageFrame title="Flow run not found" subtitle="This execution record is unavailable in the current workspace." tabs={<ControlsNav />} surfaceId="flow-run-detail" archetype="P7/P8"><Surface structure="working" as="section"><div data-state-id="flow-run-not-found"><EmptyState title="Flow run not found" description="It may fall outside your workspace access or no longer be retained. No execution was replayed or changed." action={<ButtonLink href="/controls/flows/runs" variant="secondary">Return to run history</ButtonLink>} /></div></Surface></PageFrame>;
}
