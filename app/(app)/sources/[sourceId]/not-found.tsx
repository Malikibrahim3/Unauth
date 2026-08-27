import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';

export default function SourceNotFound() {
  return (
    <PageFrame
      surfaceId="source-not-found"
      archetype="P12"
      title="Source unavailable"
      subtitle="This provider is not in the current workspace catalogue, or your role cannot access it."
      breadcrumbs={[{ label: "Sources", href: "/sources/connected" }]}
    >
      <Surface structure="working" as="section" data-state-id="source-not-found">
        <EmptyState
          title="Source unavailable"
          description="Check the provider link or return to the source registry for this workspace. No connection or credential state was changed."
          action={<ButtonLink href="/sources/connected" variant="primary">Return to sources</ButtonLink>}
        />
      </Surface>
    </PageFrame>
  );
}
