"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, ButtonLink, EmptyState, Modal } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  publicationEnabled,
}: {
  flows: FlowIndexRecord[];
  canManage: boolean;
  publicationEnabled: boolean;
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ua-border-subtle)] px-4 py-3">
        <p className="min-w-0 text-xs text-[var(--ua-text-secondary)]">
          {publicationEnabled
            ? "Each family has at most one published version and one editable draft."
            : "Drafts and tests are available. Publishing is currently unavailable."}
        </p>
        <div className="flex items-center gap-2">
          <ButtonLink href="/flows/runs" variant="secondary" size="sm">
            Run history
          </ButtonLink>
          {canManage ? (
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus className="h-3.5 w-3.5" />}
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
          className="border-b border-[var(--ua-border-subtle)] px-4 py-2 text-sm text-[var(--ua-critical)]"
        >
          {error}
        </p>
      ) : null}
      {flows.length ? (
        <ul className="divide-y divide-[var(--ua-border-subtle)]">
          {flows.map((flow) => (
            <li key={flow.name}>
              <Link
                href={`/flows/${flow.hrefId}`}
                className="grid gap-3 px-4 py-3 transition-colors hover:bg-[var(--ua-surface-hover)] focus-visible:outline-none focus-visible:shadow-[inset_var(--ua-shadow-focus)] sm:grid-cols-[minmax(0,1fr)_10rem_6rem_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {flow.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--ua-text-secondary)]">
                    {flow.description || "No operator-facing description yet."}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">
                    Trigger
                  </p>
                  <p className="mt-1 truncate font-mono text-xs">
                    {flow.trigger}
                  </p>
                </div>
                <div>
                  <p className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">
                    Actions
                  </p>
                  <p className="mt-1 font-sans tabular-nums text-sm">{flow.actionCount}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <StatusBadge
                    family="workflowStatus"
                    value={flow.status === "published" && !flow.active ? "paused" : flow.active ? "active" : flow.status}
                    size="sm"
                  />
                  <span className="font-mono text-xs text-[var(--ua-text-tertiary)]">
                    v{flow.version}
                  </span>
                  <span aria-hidden="true" className="text-[var(--ua-action-primary)]">
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No flows yet"
          description={
            publicationEnabled
              ? "Create a workflow, test it safely without affecting live data, then publish it when you're ready. Flows route work — they never decide or issue payouts."
              : "Create and test a flow without affecting live data. Flows route work; they do not decide or issue payouts."
          }
          action={
            canManage ? (
              <Button variant="primary" onClick={() => setCreating(true)}>
                Create first flow
              </Button>
            ) : undefined
          }
        />
      )}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New flow draft"
        description={
          publicationEnabled
            ? "Build trigger, conditions and bounded actions. Nothing runs until publication."
            : "Build the trigger, conditions, and bounded actions. Nothing runs until you publish."
        }
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
