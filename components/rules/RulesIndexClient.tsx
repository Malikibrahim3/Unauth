"use client";

import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  RuleBuilderDrawer,
  type RuleDraftPayload,
} from "@/components/rules/RuleBuilderDrawer";
import { useToast } from "@/components/ui/Toast";

export type RuleIndexRecord = {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  currentVersion: number | null;
  currentStatus: "draft" | "published" | "retired" | "discarded" | "disabled";
  hasDraft: boolean;
  publishedVersion: number | null;
  updatedAt: string;
};

export function RulesIndexClient({
  rules,
  canManage,
}: {
  rules: RuleIndexRecord[];
  canManage: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function createRule(payload: RuleDraftPayload) {
    setError(null);
    try {
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Rule draft could not be created");
      toast({ title: "Rule saved as draft", description: "Opening it so you can add conditions.", tone: "success" });
      router.push(`/rules/${body.rule.id}`);
      router.refresh();
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Rule draft could not be created",
      );
      return false;
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ua-border-subtle)] px-4 py-3">
        <p className="flex min-w-0 items-center gap-2 text-xs text-[var(--ua-text-secondary)]">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--ua-success)]" />
          Published versions are immutable; changes begin as drafts.
        </p>
        {canManage ? (
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setCreating(true)}
          >
            New rule
          </Button>
        ) : null}
      </div>
      {error ? (
        <p
          role="alert"
          className="border-b border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)] px-4 py-2 text-sm text-[var(--ua-critical)]"
        >
          {error}
        </p>
      ) : null}
      {rules.length > 0 ? (
        <ul className="divide-y divide-[var(--ua-border-subtle)]">
          {rules.map((rule) => (
            <li key={rule.id}>
              <Link
                href={`/rules/${rule.id}`}
                className="grid gap-3 px-4 py-3 transition-colors hover:bg-[var(--ua-surface-hover)] focus-visible:outline-none focus-visible:shadow-[inset_var(--ua-shadow-focus)] sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-[var(--ua-text-primary)]">
                    {rule.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--ua-text-secondary)]">
                    {rule.description ||
                      "No description — add intent and scope in the next draft."}
                  </p>
                </div>
                <div>
                  <p className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">
                    Priority
                  </p>
                  <p className="mt-1 font-sans tabular-nums text-sm">{rule.priority + 1}</p>
                </div>
                <div>
                  <p className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">
                    Version
                  </p>
                  <p className="mt-1 font-mono text-sm">
                    {rule.currentVersion ? `v${rule.currentVersion}` : "—"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge family="workflowStatus" value={rule.currentStatus} size="sm" />
                    {rule.hasDraft && rule.publishedVersion ? (
                      <span className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">Draft over v{rule.publishedVersion}</span>
                    ) : null}
                  </div>
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
          title="No payout rules yet"
          description="Write a rule, try it on a sample case, then publish when it looks right. Rules recommend; they never execute payouts."
          action={
            canManage ? (
              <Button variant="primary" onClick={() => setCreating(true)}>
                Create first rule
              </Button>
            ) : undefined
          }
        />
      )}
      <RuleBuilderDrawer
        key={creating ? "open" : "closed"}
        open={creating}
        mode="create"
        onClose={() => setCreating(false)}
        onSubmit={createRule}
      />
    </>
  );
}
