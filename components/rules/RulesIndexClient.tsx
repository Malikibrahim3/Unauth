"use client";

import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  PanelCard,
} from "@/components/ui";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <ShieldCheck className="h-4 w-4 text-[var(--success)]" /> Published
          versions are immutable; changes begin as drafts.
        </div>
        {canManage ? (
          <Button
            variant="primary"
            leadingIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreating(true)}
          >
            New rule
          </Button>
        ) : null}
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[var(--danger)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
      {rules.length > 0 ? (
        <div className="grid gap-3">
          {rules.map((rule) => (
            <Link
              key={rule.id}
              href={`/rules/${rule.id}`}
              className="block rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <PanelCard
                variant="app"
                className="group grid gap-3 p-4 transition-colors hover:border-[var(--accent)] sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {rule.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
                    {rule.description ||
                      "No description — add intent and scope in the next draft."}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                    Priority
                  </p>
                  <p className="mt-1 font-mono text-sm">{rule.priority + 1}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
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
                      <span className="text-[11px] text-[var(--text-tertiary)]">Draft over v{rule.publishedVersion}</span>
                    ) : null}
                  </div>
                  <span aria-hidden="true" className="text-[var(--accent)]">
                    →
                  </span>
                </div>
              </PanelCard>
            </Link>
          ))}
        </div>
      ) : (
        <PanelCard variant="app" className="p-6 text-center">
          <h2 className="text-base font-semibold">No payout rules yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
            Write a rule, try it on a sample case, then publish when it looks
            right. Rules recommend; they never execute payouts.
          </p>
          {canManage ? (
            <Button
              className="mt-5"
              variant="primary"
              onClick={() => setCreating(true)}
            >
              Create first rule
            </Button>
          ) : null}
        </PanelCard>
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
