import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';

export default function NamedReportNotFound() {
  return (
    <PageFrame
      title="Report not found"
      subtitle="This report definition is not available in the current product contract. No report data or financial state was changed."
      surfaceId="named-report-not-found"
      archetype="P12"
    >
      <Surface structure="working" as="section">
        <EmptyState
          title="Named report not found"
          description="Return to the governed report index to choose an available definition and scope."
          action={<ButtonLink href="/financials/reports" variant="primary" size="md">Return to reports</ButtonLink>}
        />
      </Surface>
    </PageFrame>
  );
}
