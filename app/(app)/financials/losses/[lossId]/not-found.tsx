import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';

export default function LossNotFound() {
  return (
    <PageFrame
      title="Loss not found"
      subtitle="This record is not available in the current workspace."
    >
      <Surface structure="working" as="section">
        <EmptyState
          title="Loss not found"
          description="It may have been removed or belong to another workspace."
          action={<ButtonLink href="/financials/losses" variant="secondary" size="md">Return to losses</ButtonLink>}
        />
      </Surface>
    </PageFrame>
  );
}
