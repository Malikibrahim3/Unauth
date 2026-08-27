import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';

export default function LossNotFound() {
  return (
    <PageFrame
      title="Loss not found"
      surfaceId="connected-record-not-found"
      archetype="P12"
      subtitle="This record is missing or inaccessible in the current workspace. No financial state was changed."
    >
      <Surface structure="working" as="section">
        <EmptyState
          title="Loss not found"
          description="For privacy, Unauth cannot confirm whether the reference belongs to another workspace. Return to the loss ledger or Overview."
          action={<div className="flex flex-wrap gap-2"><ButtonLink href="/financials/losses" variant="primary" size="md">Return to losses</ButtonLink><ButtonLink href="/overview" variant="secondary" size="md">Open Overview</ButtonLink></div>}
        />
      </Surface>
    </PageFrame>
  );
}
