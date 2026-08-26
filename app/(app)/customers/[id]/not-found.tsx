import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';

export default function CustomerNotFound() {
  return (
    <PageFrame
      title="Customer not found"
      subtitle="This customer record is not available in the current workspace."
      surfaceId="customer-profile"
      archetype="P12"
    >
      <Surface structure="working" as="section">
        <div data-state-id="customer-not-found">
          <EmptyState
            title="Customer not found"
            description="It may have been merged, removed, or belong to another workspace. No customer identifiers are shown."
            action={<ButtonLink href="/customers" variant="secondary">Return to customers</ButtonLink>}
          />
        </div>
      </Surface>
    </PageFrame>
  );
}
