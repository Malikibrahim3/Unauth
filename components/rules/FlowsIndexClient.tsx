"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Modal,
  PanelCard,
  StatusBadge,
  statusBadgeVariantFor,
} from "@/components/ui";
import {
  FlowEditor,
  type FlowDraftPayload,
} from "@/components/rules/FlowEditor";

export type FlowIndexRecord = {
  name: string;
  description: string | null;
  hrefId: string;
  trigger: string;
  status: "draft" | "published" | "retired";
  active: boolean;
  version: number;
  publishedVersion: number | null;
  hasDraft: boolean;
  actionCount: number;
  updatedAt: string;
};

export function FlowsIndexClient({
  flows,
  canManage,
}: {
  flows: FlowIndexRecord[];
  canManage: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  async function create(payload: FlowDraftPayload) {
    setError(null);
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Flow draft could not be created");
      router.push(`/flows/${body.workflow.id}`);
      router.refresh();
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Flow draft could not be created",
      );
      return false;
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-secondary)]">
          Each family has at most one published version and one editable draft.
        </p>
        <div className="flex gap-2">
          <Link
            href="/flows/runs"
            className="inline-flex items-center rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]"
          >
            Run history
          </Link>
          {canManage ? (
            <Button
              variant="primary"
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => setCreating(true)}
            >
              New flow
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
      {flows.length ? (
        <div className="grid gap-3">
          {flows.map((flow) => (
            <Link
              key={flow.name}
              href={`/flows/${flow.hrefId}`}
              className="block rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <PanelCard
                variant="app"
                className="grid gap-3 p-4 hover:border-[var(--accent)] sm:grid-cols-[minmax(0,1fr)_10rem_7rem_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {flow.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
                    {flow.description || "No operator-facing description yet."}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                    Trigger
                  </p>
                  <p className="mt-1 truncate font-mono text-xs">
                    {flow.trigger}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                    Actions
                  </p>
                  <p className="mt-1 font-mono text-sm">{flow.actionCount}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <StatusBadge
                    variant={statusBadgeVariantFor(
                      flow.active ? "active" : flow.status,
                    )}
                  >
                    {flow.hasDraft && flow.publishedVersion
                      ? `Draft over v${flow.publishedVersion}`
                      : flow.status === "published" && !flow.active
                        ? "Paused"
                        : flow.status}
                  </StatusBadge>
                  <span className="font-mono text-xs text-[var(--text-tertiary)]">
                    v{flow.version}
                  </span>
                  <span aria-hidden="true" className="text-[var(--accent)]">
                    →
                  </span>
                </div>
              </PanelCard>
            </Link>
          ))}
        </div>
      ) : (
        <PanelCard variant="app" className="p-10 text-center">
          <h2 className="text-base font-semibold">No flows yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
            Create a bounded event flow, test it without writes, then publish it
            explicitly. Flows route work; they never decide or issue payouts.
          </p>
          {canManage ? (
            <Button
              className="mt-5"
              variant="primary"
              onClick={() => setCreating(true)}
            >
              Create first flow
            </Button>
          ) : null}
        </PanelCard>
      )}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New flow draft"
        description="Build trigger, conditions and bounded actions. Nothing runs until publication."
      >
        <div className="max-h-[75vh] overflow-y-auto">
          <FlowEditor
            onCancel={() => setCreating(false)}
            onSubmit={create}
            submitLabel="Create draft"
          />
        </div>
      </Modal>
    </>
  );
}
