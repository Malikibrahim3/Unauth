import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';

export default function ImportJobNotFound() {
  return (
    <PageFrame surfaceId="import-job-not-found" archetype="P12" title="Import job unavailable" subtitle="The job does not exist in this workspace or your role cannot access it." breadcrumbs={[{ label: "Sources", href: "/sources/connected" }, { label: "Imports", href: "/sources/imports" }]}>
      <Surface structure="working" as="section" data-state-id="import-job-not-found">
        <EmptyState
          title="Import job unavailable"
          description="Check the job link or return to the import history for this workspace. No imported record or mapping was changed."
          action={<ButtonLink href="/sources/imports" variant="primary">Return to imports</ButtonLink>}
        />
      </Surface>
    </PageFrame>
  );
}
