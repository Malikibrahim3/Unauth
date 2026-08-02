import { ButtonLink, EmptyState, PageFrame, Surface } from "@/components/ui";

/** Route-owned, truthful unavailable state for Phase 20 connected objects. */
export function ConnectedObjectNotFound({
  kind,
  returnHref = "/customers",
}: {
  kind: "dispute" | "support ticket";
  returnHref?: string;
}) {
  const title = `${kind === "support ticket" ? "Support ticket" : "Dispute"} not found`;
  return (
    <PageFrame title={title} subtitle="This source record is not available in the current workspace.">
      <Surface structure="working" as="section">
        <EmptyState
          title={title}
          description="It may have been removed, disconnected, or belong to another workspace."
          action={<ButtonLink href={returnHref} variant="secondary" size="md">Return to customers</ButtonLink>}
        />
      </Surface>
    </PageFrame>
  );
}
