import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';

export default function RecoveryNotFound() {
  return (
    <PageFrame
      title="Recovery not found"
      subtitle="This recovery is missing or inaccessible in the current workspace. No financial or recovery state was changed."
      surfaceId="recovery-not-found"
      archetype="P12"
    >
      <Surface structure="working" as="section">
        <EmptyState
          title="Recovery not found"
          description="For privacy, Unauth cannot confirm whether the reference belongs to another workspace. Return to recovery operations or Overview."
          action={<div className="flex flex-wrap gap-2"><ButtonLink href="/financials/recovery" variant="primary" size="md">Return to recovery</ButtonLink><ButtonLink href="/overview" variant="secondary" size="md">Open Overview</ButtonLink></div>}
        />
      </Surface>
    </PageFrame>
  );
}
