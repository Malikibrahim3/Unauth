import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';

export default function CaseNotFound() {
  return (
    <PageFrame
      title="Case not found"
      subtitle="This case is not available in the current workspace."
      surfaceId="case-review-workbench"
      archetype="P12"
    >
      <Surface structure="working" as="section">
        <div data-state-id="case-not-found">
          <EmptyState
            title="Case not found"
            description="It may have been removed, merged, or belong to another workspace. No case facts or decisions are shown."
            action={<ButtonLink href="/cases" variant="secondary">Return to cases</ButtonLink>}
          />
        </div>
      </Surface>
    </PageFrame>
  );
}
