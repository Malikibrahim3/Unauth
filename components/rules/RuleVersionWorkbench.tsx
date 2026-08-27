"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { BeforeYouConfirm, Modal } from "@/components/ui";
import { ACTION_LABELS, summarizeConditions } from "@/lib/rules/summary";
import type { MerchantRule, RuleCondition } from "@/lib/rules-engine";
import { formatDateTime } from "@/lib/utils/format";
import styles from "./RuleVersionsOperations.module.css";

export type RuleVersionRecord = {
  id: string;
  version: number;
  status: "draft" | "published" | "retired" | "discarded";
  name: string;
  description: string | null;
  conditions: RuleCondition[];
  action: MerchantRule["action"];
  condition_operator: MerchantRule["condition_operator"];
  priority: number;
  created_at: string;
  published_at: string | null;
  published_by?: string | null;
  supersedes_version_id?: string | null;
};

type PublishPreview = {
  version: number;
  dataRequirements: string[];
  conflicts: Array<{ ruleId: string; name: string; reason: string }>;
};

type VersionState = "Draft" | "Live" | "Superseded";

function valueChanged(left: unknown, right: unknown) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function stateFor(version: RuleVersionRecord, live: RuleVersionRecord | null): VersionState {
  if (version.status === "draft") return "Draft";
  if (version.id === live?.id || version.status === "published") return "Live";
  return "Superseded";
}

function selectConditions(version: RuleVersionRecord, pattern: RegExp) {
  return version.conditions.filter((condition) => pattern.test(condition.field));
}

function conditionCopy(version: RuleVersionRecord, conditions: RuleCondition[], empty: string) {
  return conditions.length ? summarizeConditions(conditions, version.condition_operator) : empty;
}

function comparisonFields(version: RuleVersionRecord) {
  const threshold = selectConditions(version, /amount|value|exposure|price|cost|total/i);
  const cause = selectConditions(version, /cause|reason|category|type|delivery|issue/i);
  const evidence = selectConditions(version, /evidence|proof|scan|tracking|photo|document/i);

  return [
    { field: "Value threshold", value: conditionCopy(version, threshold, "No value threshold recorded") },
    { field: "Cause filter", value: conditionCopy(version, cause, "No cause filter recorded") },
    { field: "Recommended action", value: ACTION_LABELS[version.action] },
    { field: "Evidence step", value: conditionCopy(version, evidence, "No separate evidence step recorded") },
    { field: "Ownership", value: `Priority ${version.priority} · evaluated in rule order` },
    { field: "Notification", value: "No notification action recorded" },
  ];
}

function versionSummary(version: RuleVersionRecord) {
  if (version.description?.trim()) return version.description;
  if (version.conditions.length) return summarizeConditions(version.conditions, version.condition_operator);
  return `Recommends ${ACTION_LABELS[version.action].toLowerCase()}`;
}

export function RuleVersionWorkbench({
  ruleId,
  initialVersions,
  canManage,
}: {
  ruleId: string;
  initialVersions: RuleVersionRecord[];
  canManage: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [versions, setVersions] = useState(initialVersions);
  const [swapped, setSwapped] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [publishPreview, setPublishPreview] = useState<PublishPreview | null>(null);

  const draft = versions.find((version) => version.status === "draft") ?? null;
  const live = versions.find((version) => version.status === "published") ?? null;
  const working = draft ?? live ?? versions[0]!;
  const requestedVersion = Number(searchParams.get("version"));
  const selected = Number.isInteger(requestedVersion)
    ? versions.find((version) => version.version === requestedVersion) ?? working
    : working;
  const baseline = useMemo(() => {
    if (live && live.id !== selected.id) return live;
    return versions.find((version) => version.id !== selected.id && version.version < selected.version && version.status !== "discarded")
      ?? versions.find((version) => version.id !== selected.id)
      ?? selected;
  }, [live, selected, versions]);
  const left = swapped ? selected : baseline;
  const right = swapped ? baseline : selected;
  const leftFields = comparisonFields(left);
  const rightFields = comparisonFields(right);
  const rows = rightFields.map((field, index) => ({
    field: field.field,
    left: leftFields[index]?.value ?? "— Unavailable",
    right: field.value,
    changed: valueChanged(leftFields[index]?.value, field.value),
  }));
  const changedCount = rows.filter((row) => row.changed).length;
  const selectedState = stateFor(selected, live);

  function versionHref(version: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("tab");
    if (version === working.version) next.delete("version");
    else next.set("version", String(version));
    return `${pathname}${next.size ? `?${next.toString()}` : ""}`;
  }

  async function refresh() {
    const response = await fetch(`/api/rules/${ruleId}/versions`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Could not reload versions");
    setVersions(body.versions ?? []);
  }

  async function previewPublish() {
    if (!draft) return;
    setBusy("preview");
    setMessage(null);
    try {
      const response = await fetch(`/api/rules/${ruleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Publish preview failed");
      setPublishPreview(body);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Publish preview failed" });
    } finally {
      setBusy(null);
    }
  }

  async function confirmPublish() {
    setBusy("publish");
    try {
      const response = await fetch(`/api/rules/${ruleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, acceptConflicts: Boolean(publishPreview?.conflicts.length) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Publish failed");
      setPublishPreview(null);
      await refresh();
      setMessage({ tone: "success", text: `Version ${body.published.version} published atomically.` });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Publish failed" });
    } finally {
      setBusy(null);
    }
  }

  async function rollback(version: number) {
    setBusy(`rollback-${version}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/rules/${ruleId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Rollback draft failed");
      await refresh();
      setMessage({ tone: "success", text: `Version ${version} copied into a new draft. Review and publish it explicitly.` });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Rollback failed" });
    } finally {
      setBusy(null);
    }
  }

  function selectedAction() {
    if (selectedState === "Draft") return previewPublish();
    if (selectedState === "Superseded") return rollback(selected.version);
  }

  const selectedActionLabel = selectedState === "Draft"
    ? `Publish v${selected.version}`
    : selectedState === "Live"
      ? "Currently live"
      : `Roll back to v${selected.version}`;
  const selectedActionDisabled = !canManage || selectedState === "Live" || (selectedState === "Superseded" && Boolean(draft));

  return (
    <div className={styles.root} data-operations-surface="rule-versions">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.breadcrumb}>Unauth <span>›</span> Payout rules › Version history</p>
          <h1>Version history</h1>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryButton} href={`/controls/rules?selected=${ruleId}`}>Back to rule</Link>
          <button className={styles.primaryButton} type="button" disabled={!canManage || !draft || busy === "preview"} onClick={previewPublish}>
            {draft ? `Publish draft v${draft.version}` : "No draft to publish"}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {message ? <p className={styles.message} data-tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p> : null}
        <div className={styles.notice}>
          <i />
          <span>Every published version stays readable.</span>
          <b>·</b>
          <em>Publication is atomic — a rule is never half-live, and rolling back creates a new version rather than deleting one.</em>
        </div>

        <div className={styles.layout}>
          <section className={styles.versionCard} aria-label="Version history">
            <header><h2>Version history</h2><p>{working.name}</p></header>
            <div>
              {versions.map((version) => {
                const state = stateFor(version, live);
                return (
                  <Link key={version.id} className={styles.versionRow} data-selected={version.id === selected.id} href={versionHref(version.version)} aria-current={version.id === selected.id ? "page" : undefined}>
                    <span className={styles.versionTop}>
                      <strong>v{version.version}</strong>
                      <i data-state={state.toLowerCase()}>{state}</i>
                      <time>{formatDateTime(version.published_at ?? version.created_at)}</time>
                    </span>
                    <span className={styles.versionSummary}>{versionSummary(version)}</span>
                    <span className={styles.versionMeta}>
                      <span>{version.published_by ? "Named publisher recorded" : "Author unavailable"}</span>
                      <b>Impact unavailable</b>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className={styles.detailColumn}>
            <section className={styles.diffCard}>
              <header className={styles.cardHeader}>
                <div><h2>v{left.version} compared with v{right.version}</h2><p>{changedCount} {changedCount === 1 ? "field differs" : "fields differ"} · {stateFor(right, live).toLowerCase()}</p></div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setSwapped((current) => !current)}>Swap sides</button>
                  <button type="button" className={selectedState === "Live" ? styles.inactiveButton : styles.primaryButton} disabled={selectedActionDisabled || busy === `rollback-${selected.version}` || busy === "preview"} onClick={selectedAction}>{selectedActionLabel}</button>
                </div>
              </header>
              <div className={styles.diffLabels}>
                <span>v{left.version} · {stateFor(left, live).toLowerCase()}</span>
                <span>v{right.version} · {stateFor(right, live).toLowerCase()}</span>
              </div>
              <div className={styles.diffRows}>
                {rows.map((row) => (
                  <div className={styles.diffRow} key={row.field} data-changed={row.changed}>
                    <div><span>{row.field}</span><p>{row.left}</p></div>
                    <div><span>{row.field}{row.changed ? <i>Changed</i> : null}</span><p>{row.right}</p></div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.impactCard}>
              <header>
                <div><h2>What changed in practice</h2><p>Measured on the same 30 days of cases, replayed against both versions</p></div>
                <i>Replay only · no real events</i>
              </header>
              <div className={styles.impactRows}>
                {["Cases matched", "Value in scope", "Share of open cases"].map((label) => (
                  <div className={styles.impactRow} key={label}>
                    <span>{label}</span>
                    <div><i /><b>— Unavailable</b></div>
                    <div><i /><b>— Unavailable</b></div>
                    <em>—</em>
                  </div>
                ))}
              </div>
              <footer>
                <span><i data-tone="baseline" />v{left.version} · {stateFor(left, live).toLowerCase()}</span>
                <span><i data-tone="selected" />v{right.version} · {stateFor(right, live).toLowerCase()}</span>
                <p>Replay results are unavailable because per-version evaluation receipts are not retained.</p>
              </footer>
            </section>
          </div>
        </div>
      </main>

      <Modal open={Boolean(publishPreview)} onClose={() => setPublishPreview(null)} title="Publish rule version" description="Publication is atomic. The existing version remains active if any step fails." overlayId="rule-publication-modal" actions={[{ label: busy === "publish" ? "Publishing…" : `Publish v${publishPreview?.version ?? ""}`, onClick: confirmPublish, variant: publishPreview?.conflicts.length ? "danger" : "primary" }]}>
        {publishPreview ? (
          <div className="ua-text-body space-y-3">
            <BeforeYouConfirm
              objectSummary={`${working.name} · version ${publishPreview.version}`}
              valueSummary="Future rule evaluations in this workspace"
              externalAction="Publishes recommendation logic only; it does not record a merchant decision or contact a provider"
              reversible="Yes — copy an earlier version into a new draft, then review and publish it explicitly"
              appendOnly="Named publisher, version, conflicts accepted, and publication time in the rule audit history"
            />
            <p><strong>Required data:</strong> {publishPreview.dataRequirements.join(", ") || "None"}</p>
            {publishPreview.conflicts.length ? (
              <div className="rounded-md border border-[var(--uo-route-warning)] bg-[var(--uo-route-warning-bg)] p-3">
                <p className="ua-text-working-title">{publishPreview.conflicts.length} conflict{publishPreview.conflicts.length === 1 ? "" : "s"} require explicit acceptance</p>
                <ul className="ua-text-caption-role mt-2 list-disc pl-5">{publishPreview.conflicts.map((conflict) => <li key={conflict.ruleId}>{conflict.name}: {conflict.reason}</li>)}</ul>
              </div>
            ) : <p className="flex items-center gap-2 text-[var(--uo-route-success)]"><CheckCircle2 className="h-4 w-4" /> No same-priority condition conflicts detected.</p>}
            <p className="ua-text-caption-role">Only future evaluations use this version. Historical decisions retain their original rule evidence.</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
