"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Pencil, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, EmptyState, IconButton, RegistrySurface } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  RuleBuilderDrawer,
  type RuleDraftPayload,
} from "@/components/rules/RuleBuilderDrawer";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from '@/lib/utils/format';
import { LifecycleGuide } from './ControlsNav';
import styles from './AutomationControls.module.css';
import type { ConditionOperator, MerchantRule, RuleAction, RuleCondition } from '@/lib/rules-engine';

export type RuleIndexRecord = {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  currentVersion: number | null;
  currentVersionId: string | null;
  currentStatus: "draft" | "published" | "retired" | "discarded" | "disabled";
  hasDraft: boolean;
  publishedVersion: number | null;
  updatedAt: string;
  action: RuleAction;
  conditions: RuleCondition[];
  conditionOperator: ConditionOperator;
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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const query = searchParams.get('search') ?? '';
  const status = searchParams.get('state') ?? 'all';
  const type = ['approve', 'manual_review', 'deny'].includes(searchParams.get('type') ?? '')
    ? searchParams.get('type')!
    : 'all';
  const sort = ['updated_desc', 'name_asc'].includes(searchParams.get('sort') ?? '')
    ? searchParams.get('sort')!
    : 'priority';
  const selectedId = searchParams.get('selected');
  const selectedRule = rules.find((rule) => rule.id === selectedId) ?? null;
  const filteredRules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = rules.filter((rule) => {
      const matchesQuery = !needle || `${rule.name} ${rule.description ?? ''}`.toLowerCase().includes(needle);
      const lifecycle = rule.hasDraft ? 'draft' : rule.publishedVersion ? 'published' : rule.currentStatus;
      return matchesQuery
        && (status === 'all' || status === lifecycle || status === rule.currentStatus)
        && (type === 'all' || type === rule.action);
    });
    return matches.sort((left, right) => {
      if (sort === 'updated_desc') return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      if (sort === 'name_asc') return left.name.localeCompare(right.name);
      return left.priority - right.priority;
    });
  }, [query, rules, sort, status, type]);
  const handoffRule = selectedRule ?? filteredRules[0] ?? null;

  function setFilter(key: 'search' | 'state' | 'type' | 'sort' | 'selected', value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all' || (key === 'sort' && value === 'priority')) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
  }

  function selectedAsRule(rule: RuleIndexRecord): MerchantRule {
    return {
      id: rule.id,
      merchant_id: '',
      name: rule.name,
      description: rule.description,
      is_active: rule.currentStatus === 'published',
      priority: rule.priority,
      conditions: rule.conditions,
      action: rule.action,
      condition_operator: rule.conditionOperator,
    };
  }

  async function saveSelectedDraft(payload: RuleDraftPayload) {
    if (!selectedRule) return false;
    setError(null);
    try {
      const updateExistingDraft = selectedRule.hasDraft && selectedRule.currentVersionId;
      const endpoint = updateExistingDraft
        ? `/api/rules/${selectedRule.id}/versions/${selectedRule.currentVersionId}`
        : `/api/rules/${selectedRule.id}/versions`;
      const response = await fetch(endpoint, {
        method: updateExistingDraft ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Rule draft could not be saved');
      toast({
        title: selectedRule.hasDraft ? 'Rule draft updated' : 'Rule draft created',
        description: 'The published recommendation remains unchanged until an explicit publish review.',
        tone: 'success',
      });
      router.refresh();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Rule draft could not be saved');
      return false;
    }
  }

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
      router.push(`/controls/rules/${body.rule.id}`);
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
      <div className="ua-rules-handoff-layout">
      <RegistrySurface
        aria-label="Rules"
        toolbar={
          <div className={styles.toolbar}>
            <label className={styles.searchWrap}>
              <span className="sr-only">Search rules</span>
              <Search className={styles.searchIcon} aria-hidden="true" />
              <input className={styles.searchInput} value={query} onChange={(event) => setFilter('search', event.target.value)} placeholder="Search rules by name or intent" />
            </label>
            <label>
              <span className="sr-only">Filter rules by lifecycle</span>
              <select className={styles.filterSelect} value={status} onChange={(event) => setFilter('state', event.target.value)}>
                <option value="all">All lifecycle states</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="retired">Historical</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter rules by recommendation</span>
              <select className={styles.filterSelect} value={type} onChange={(event) => setFilter('type', event.target.value)}>
                <option value="all">All recommendations</option>
                <option value="approve">Approve</option>
                <option value="manual_review">Manual review</option>
                <option value="deny">Deny</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Sort rules</span>
              <select className={styles.filterSelect} value={sort} onChange={(event) => setFilter('sort', event.target.value)}>
                <option value="priority">Priority order</option>
                <option value="updated_desc">Recently updated</option>
                <option value="name_asc">Name A–Z</option>
              </select>
            </label>
            {canManage ? (
              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setCreating(true)}
              >
                Create rule
              </Button>
            ) : null}
          </div>
        }
        resultCount={`${filteredRules.length} of ${rules.length}`}
      >
        <LifecycleGuide kind="rule" />
        {error ? (
          <p role="alert" className={styles.message} data-tone="error">{error}</p>
        ) : null}
        {filteredRules.length > 0 ? (
          <>
            <div className={styles.registryHeader} aria-hidden="true"><span>Rule</span><span>Priority</span><span>Version</span><span>Lifecycle</span><span /></div>
            <ul className="m-0 list-none p-0">
          {filteredRules.map((rule) => (
            <li key={rule.id} className={styles.registryRow} data-selected={selectedRule?.id === rule.id}>
              <Link href={`/controls/rules/${rule.id}`} className={styles.registryIdentityLink}>
                <div className={styles.identity}>
                  <h2 className={styles.identityTitle}>{rule.name}</h2>
                  <p className={styles.identityCopy}>{rule.description || "No operator-facing intent has been recorded."}</p>
                </div>
              </Link>
                <div>
                  <span className={styles.cellLabel}>Priority</span>
                  <span className={`${styles.cellValue} ${styles.cellStrong}`}>{rule.priority + 1}</span>
                </div>
                <div>
                  <span className={styles.cellLabel}>Version</span>
                  <span className={styles.cellValue}>{rule.currentVersion ? `v${rule.currentVersion}` : "Unavailable"}</span>
                </div>
                <div>
                  <div className={styles.versionStack}><StatusBadge family="workflowStatus" value={rule.currentStatus} size="sm" /></div>
                  <div className={styles.updated}>{rule.hasDraft && rule.publishedVersion ? `Draft over v${rule.publishedVersion}` : formatDateTime(rule.updatedAt)}</div>
                </div>
                {canManage ? (
                  <IconButton
                    size="sm"
                    label={`Edit ${rule.name} draft`}
                    title="Open contextual builder"
                    icon={<Pencil size={13} />}
                    onClick={() => setFilter('selected', rule.id)}
                  />
                ) : (
                  <Link href={`/controls/rules/${rule.id}`} className={styles.rowArrow} aria-label={`Open ${rule.name}`}><ArrowRight size={14} aria-hidden="true" /></Link>
                )}
            </li>
          ))}
            </ul>
          </>
        ) : rules.length > 0 ? (
          <div data-state-id="rules-empty-state"><EmptyState title="No rules match these filters" description="Clear the search or lifecycle filter to return to the complete rule registry." action={<Button variant="secondary" onClick={() => router.replace(pathname, { scroll: false })}>Clear filters</Button>} /></div>
        ) : (
          <div data-state-id="rules-empty-state"><EmptyState title="Create the first recommendation rule" description="Define a draft, simulate it on sample case signals and publish only after the effect is clear. Rules recommend; they never decide or pay." action={canManage ? <Button variant="primary" onClick={() => setCreating(true)}>Create first rule</Button> : <Link href="/help" className="ua-text-working-title text-[var(--uo-route-action-primary)] hover:underline">Review rule permissions</Link>} /></div>
        )}
      </RegistrySurface>
      <aside className="ua-rules-handoff-inspector" aria-label="Selected rule">
        {handoffRule ? (
          <>
            <header><div><h2>{handoffRule.name}</h2><p>Priority {handoffRule.priority + 1} · {handoffRule.currentVersion ? `version ${handoffRule.currentVersion}` : 'version unavailable'}</p></div><StatusBadge family="workflowStatus" value={handoffRule.currentStatus} size="sm" /></header>
            <section><h3>Conditions</h3>{handoffRule.conditions.length ? <ul>{handoffRule.conditions.map((condition, index) => <li key={`${condition.field}-${index}`}><span>{index === 0 ? 'IF' : handoffRule.conditionOperator.toUpperCase()}</span><b>{condition.field.replaceAll('_', ' ')}</b><em>{String(condition.operator).replaceAll('_', ' ')} {String(condition.value)}</em></li>)}</ul> : <p>No conditions are recorded for this version.</p>}</section>
            <section><h3>Then recommend</h3><div className="ua-rules-handoff-inspector__recommend">{handoffRule.action.replaceAll('_', ' ')}<small>A person still confirms and records the merchant decision.</small></div></section>
            <section><h3>Impact, last 30 days</h3><div className="ua-rules-handoff-inspector__unavailable"><b>Impact unavailable</b><p>Per-rule value attribution is not retained by the current evaluation source. Publication state is not treated as proof of impact.</p></div></section>
            <footer><Link href={`/controls/rules/${handoffRule.id}`} className="ua-button ua-button--primary ua-button--sm">Open rule</Link><Link href={`/controls/rules/${handoffRule.id}`} className="ua-button ua-button--secondary ua-button--sm">Version history</Link></footer>
          </>
        ) : <p className="ua-text-caption-role p-5">Create a rule to inspect its conditions and recommendation boundary.</p>}
      </aside>
      </div>
      <RuleBuilderDrawer
        key={creating ? "open" : "closed"}
        open={creating}
        mode="create"
        overlayId="rule-builder-drawer"
        onClose={() => setCreating(false)}
        onSubmit={createRule}
      />
      {selectedRule && canManage ? (
        <RuleBuilderDrawer
          key={`${selectedRule.id}-${selectedRule.currentVersionId ?? 'new-draft'}`}
          open
          mode="edit"
          initialRule={selectedAsRule(selectedRule)}
          onClose={() => setFilter('selected', '')}
          onSubmit={saveSelectedDraft}
          overlayId="rule-builder-drawer"
        />
      ) : null}
    </>
  );
}
