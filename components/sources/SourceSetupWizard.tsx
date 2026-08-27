"use client";

import Link from "next/link";
import { ArrowRight, Check, CircleAlert, PackageOpen, ShieldCheck } from "lucide-react";
import { ConnectionActions } from "@/components/integrations/ConnectionActions";
import type {
  ConnectionConfigurationState,
  ConnectionOperationalState,
} from "@/lib/connections/readModel";
import type { EffectiveConnectionBadge } from "@/lib/connections/effectiveStatus";
import styles from "./SourceSetupOperations.module.css";

type Capability = { id: string; description: string; support: string };
const STEPS = ["provider", "permissions", "mapping", "history", "schedule", "review", "activate"] as const;
type StepId = (typeof STEPS)[number];

function resolveStep(value: string | undefined): StepId {
  if (value === 'connect') return 'permissions';
  if (value === 'backfill') return 'history';
  if (value === 'verify') return 'review';
  return STEPS.includes(value as StepId) ? value as StepId : 'provider';
}

function deliveryLabel(value: string) {
  if (value === "periodic_sync") return "Periodic provider sync";
  if (value === "webhook") return "Provider events";
  if (value === "on_demand") return "On-demand retrieval";
  return "Provider-defined delivery";
}

function stageHref(providerId: string, step: StepId, returnTo: string) {
  const params = new URLSearchParams({ step });
  if (returnTo !== `/sources/${providerId}`) params.set("returnTo", returnTo);
  return `/sources/setup/${providerId}?${params.toString()}`;
}

function StatePill({ tone, children }: { tone: "positive" | "warning" | "neutral" | "info"; children: React.ReactNode }) {
  return <span className={styles.pill} data-tone={tone}>{children}</span>;
}

function StatusIcon({ passed, warning = false }: { passed: boolean; warning?: boolean }) {
  return <span className={styles.statusIcon} data-tone={passed ? "positive" : warning ? "warning" : "neutral"}>{passed ? <Check size={11} /> : warning ? <CircleAlert size={11} /> : "·"}</span>;
}

export function SourceSetupWizard({ providerId, providerName, configuration, operational, badge, connectionNote, stage, description, capabilities, deliveryModel, connectEnabled, canManage, initialStep, returnTo }: {
  providerId: string;
  providerName: string;
  configuration: ConnectionConfigurationState;
  operational: ConnectionOperationalState;
  badge: EffectiveConnectionBadge;
  connectionNote: string | null;
  stage: string;
  description: string;
  capabilities: Capability[];
  deliveryModel: string;
  connectEnabled: boolean;
  canManage: boolean;
  initialStep?: string;
  returnTo: string;
}) {
  const active = resolveStep(initialStep);
  const activeIndex = STEPS.indexOf(active);
  const planned = stage === "planned" || !connectEnabled;
  const supported = capabilities.filter((capability) => capability.support !== "unsupported");
  const unsupported = capabilities.filter((capability) => capability.support === "unsupported");
  const stageDefinitions: Array<{ id: StepId; label: string; meta: string }> = [
    { id: "provider", label: "Provider", meta: providerName },
    { id: "permissions", label: "Permissions", meta: "read-only boundary" },
    { id: "mapping", label: "Field mapping", meta: `${supported.length} supported` },
    { id: "history", label: "History", meta: "scope after access" },
    { id: "schedule", label: "Schedule", meta: deliveryLabel(deliveryModel) },
    { id: "review", label: "Review", meta: operational === "healthy" ? "checks recorded" : "attention remains" },
    { id: "activate", label: "Activate", meta: planned ? "unavailable" : "explicit action" },
  ];
  const checks = [
    { label: "Provider contract available", detail: planned ? "Authentication and activation are not implemented for this connector." : "The provider-owned connection route is available.", passed: !planned },
    { label: "Authorisation recorded", detail: configuration === "configured" ? "A provider configuration exists for this workspace." : "No verified provider configuration is recorded yet.", passed: configuration === "configured" },
    { label: "Canonical fields supported", detail: `${supported.length} supported capabilities use adapter-owned mappings; ${unsupported.length} remain unavailable.`, passed: supported.length > 0 },
    { label: "Operational signal verified", detail: operational === "healthy" ? "The latest measurable source signal is healthy." : connectionNote ?? "A healthy live source signal has not been verified.", passed: operational === "healthy" },
    { label: "Coverage limitations disclosed", detail: unsupported.length ? "Unsupported capability families remain explicitly unavailable." : "No unsupported capability is declared by the adapter.", passed: true },
  ];
  const passedChecks = checks.filter((check) => check.passed).length;

  return (
    <div className={styles.root} data-source-setup data-testid="source-setup-wizard" data-state-id={planned ? "planned-connector-setup" : `connector-setup-${active}`}>
      <section className={styles.progressCard}>
        <ol className={styles.progress} aria-label={`${providerName} setup stages`}>
          {stageDefinitions.map((step, index) => {
            const complete = index < activeIndex;
            const current = index === activeIndex;
            return (
              <li key={step.id}>
                <Link href={stageHref(providerId, step.id, returnTo)} className={styles.stageButton} aria-current={current ? "step" : undefined} data-current={current}>
                  <span className={styles.stageNumber} data-state={complete ? "complete" : current ? "current" : "pending"}>{complete ? <Check size={12} /> : index + 1}</span>
                  <span><strong>{step.label}</strong><small>{step.meta}</small></span>
                </Link>
                {index < stageDefinitions.length - 1 ? <i /> : null}
              </li>
            );
          })}
        </ol>
      </section>

      {active === "provider" ? (
        <div className={styles.twoColumn}>
          <section className={`${styles.card} ${styles.connectCard}`}>
            <div className={styles.identity}><span><PackageOpen size={18} /></span><div><h2>{providerName}</h2><p>{description}</p></div></div>
            <dl className={styles.providerOverview}>
              <div><dt>Product availability</dt><dd>{planned ? 'Not available yet' : stage === 'partial' ? 'Partial' : stage === 'beta' ? 'Beta' : 'Available'}</dd></div>
              <div><dt>Workspace configuration</dt><dd>{configuration === 'configured' ? 'Configured' : 'Not configured'}</dd></div>
              <div><dt>Current usability</dt><dd>{operational === 'unknown' ? 'Unavailable' : operational}</dd></div>
              <div><dt>Delivery</dt><dd>{deliveryLabel(deliveryModel)}</dd></div>
            </dl>
            <p className={styles.truthNote}><i />Choosing a provider does not authorize it, prove credentials, return records, or establish source health.</p>
          </section>
          <section className={styles.sideCard}><h2>What this setup preserves</h2><p>Seven steps keep provider identity, permissions, mapping, history, schedule, review and activation separately confirmable.</p><p className={styles.limit}><i />Your inputs remain attached to this setup route while you move between steps.</p><p className={styles.limit}><i data-tone="positive" />Only the final activation region can change connection state.</p></section>
        </div>
      ) : null}

      {active === "mapping" ? (
        <div className={styles.twoColumn}>
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <div><h2>Field mapping</h2><p>{providerName} capabilities on the left, the canonical Unauth fact each one supplies on the right</p></div>
              <StatePill tone={unsupported.length ? "warning" : "positive"}>{supported.length} of {capabilities.length} mapped</StatePill>
            </header>
            <div className={styles.mappingHeader}><span>{providerName} field</span><span /><span>Unauth field</span><span>State</span></div>
            <div className={styles.mappingRows}>
              {capabilities.map((capability) => {
                const mapped = capability.support !== "unsupported";
                return (
                  <div className={styles.mappingRow} key={capability.id}>
                    <span><code>{capability.id}</code><small>Sample unavailable until live authorisation</small></span>
                    <ArrowRight size={13} aria-hidden="true" />
                    <span className={styles.mappingTarget}>{mapped ? capability.id : "Not available"}</span>
                    <StatePill tone={mapped ? "positive" : "neutral"}>{mapped ? "Mapped" : "No source"}</StatePill>
                  </div>
                );
              })}
            </div>
            <p className={styles.cardNote}><i />{unsupported.length ? `${unsupported.length} capability ${unsupported.length === 1 ? "family is" : "families are"} unavailable. Unauth leaves those facts unavailable rather than inferring them.` : "Every declared adapter capability has a canonical target. Live samples are still verified after authorisation."}</p>
          </section>

          <aside className={styles.sideStack}>
            <section className={styles.sideCard}><h2>Sample preview</h2><p>Verified values appear only after the provider returns a live record.</p><dl><div><dt>Provider</dt><dd>{providerName}</dd></div><div><dt>Delivery</dt><dd>{deliveryLabel(deliveryModel)}</dd></div><div><dt>Configuration</dt><dd>{configuration === "configured" ? "Recorded" : "Unavailable"}</dd></div><div><dt>Operational state</dt><dd>{operational === "unknown" ? "Unavailable" : operational}</dd></div></dl></section>
            <section className={styles.sideCard}><h2>Capability limits</h2>{unsupported.length ? unsupported.map((capability) => <p className={styles.limit} key={capability.id}><i />{capability.description} is not supplied by this connector.</p>) : <p className={styles.limit}><i data-tone="positive" />No unsupported capability is declared. Provider-specific API limits still apply.</p>}<p className={styles.limit}><i />Historical windows and row counts remain unavailable until the live account confirms them.</p></section>
          </aside>
        </div>
      ) : null}

      {active === "permissions" ? (
        <div className={styles.twoColumn}>
          <section className={`${styles.card} ${styles.connectCard}`}>
            <div className={styles.identity}><span><PackageOpen size={18} /></span><div><h2>Connect {providerName}</h2><p>{description}</p></div></div>
            <div className={styles.fieldLabel}>Access requested</div>
            <div className={styles.scopeList}>
              {capabilities.map((capability) => {
                const granted = capability.support !== "unsupported";
                return <div key={capability.id}><StatusIcon passed={granted} /><span><strong>{capability.description}</strong><small>{granted ? "Read access through the shipped adapter" : "Not requested because this adapter does not support it"}</small></span><StatePill tone={granted ? "positive" : "neutral"}>{granted ? "Requested" : "Not requested"}</StatePill></div>;
              })}
              <div><StatusIcon passed={false} /><span><strong>Write access</strong><small>Unauth does not create provider records or move money</small></span><StatePill tone="neutral">Never</StatePill></div>
            </div>
            <p className={styles.truthNote}><i />Unauth requests the minimum available read boundary. Provider credentials are handled by the connection flow and are never rendered on this page.</p>
            <div className={styles.connectionActions}><p>{planned ? 'Connection is unavailable until provider authentication and runtime support are implemented.' : 'Review these permissions now. No provider request is sent until the final activation step.'}</p></div>
          </section>
          <section className={styles.sideCard}><h2>Credential handling</h2><p className={styles.credential}><ShieldCheck size={14} />Tokens are encrypted at rest and are not shown again after authorisation.</p><p className={styles.credential}><ShieldCheck size={14} />Unauth stores provider identifiers required for the connection, not a merchant password.</p><p className={styles.credential}><ShieldCheck size={14} />Revoking provider access stops future ingestion and makes freshness unavailable.</p></section>
        </div>
      ) : null}

      {active === "history" ? (
        <section className={`${styles.card} ${styles.backfillCard}`}>
          <header className={styles.cardHeader}><div><h2>Backfill history</h2><p>Unauth reads history before it states any figure from this source</p></div></header>
          <div className={styles.backfillRows}>
            {supported.slice(0, 3).map((capability) => <div key={capability.id}><span><strong>{capability.description}</strong><small>Available range is confirmed after authorisation</small></span><b>Unavailable</b><i data-unavailable="true" /></div>)}
            {!supported.length ? <p className={styles.empty}>No supported history family is available for this connector.</p> : null}
          </div>
          <p className={styles.cardNote}><i />Historical totals, progress and reconciliation remain unavailable until the provider completes a real backfill. Nothing is estimated from a partial read.</p>
        </section>
      ) : null}

      {active === "schedule" ? (
        <div className={styles.twoColumn}>
          <section className={`${styles.card} ${styles.connectCard}`}>
            <header className={styles.cardHeader}><div><h2>Sync schedule</h2><p>Delivery timing remains provider-owned and separate from freshness.</p></div></header>
            <dl className={styles.providerOverview}>
              <div><dt>Delivery model</dt><dd>{deliveryLabel(deliveryModel)}</dd></div>
              <div><dt>Latest operational state</dt><dd>{operational === 'unknown' ? 'Unavailable' : operational}</dd></div>
              <div><dt>Freshness proof</dt><dd>{operational === 'healthy' ? 'Measured by latest live signal' : 'Not verified as healthy'}</dd></div>
              <div><dt>Missed delivery behavior</dt><dd>Shown as stale, delayed, or unavailable</dd></div>
            </dl>
            <p className={styles.cardNote}><i />A schedule does not guarantee a completed sync. Source detail retains attempts, returned rows, failures and latest data separately.</p>
          </section>
          <section className={styles.sideCard}><h2>Saved-input clarity</h2><p>This adapter owns its schedule. No unsaved schedule choice is collected on this step.</p><p className={styles.limit}><i />Provider-specific controls appear only where the shipped adapter supports them.</p></section>
        </div>
      ) : null}

      {active === "review" ? (
        <div className={styles.twoColumn}>
          <section className={styles.card}>
            <header className={styles.cardHeader}><div><h2>Verification checks</h2><p>A source is only marked healthy once every required check passes on real data</p></div></header>
            <div className={styles.checks}>{checks.map((check) => <div key={check.label}><StatusIcon passed={check.passed} warning={!check.passed} /><span><strong>{check.label}</strong><small>{check.detail}</small></span><StatePill tone={check.passed ? "positive" : "warning"}>{check.passed ? "Passed" : "Blocked"}</StatePill></div>)}</div>
            <footer className={styles.verifyFooter}><span>{passedChecks} of {checks.length} checks passed · a source is never shown as healthy on a partial pass{planned ? ' · connection unavailable' : ''}</span>{planned ? null : <Link href={stageHref(providerId, "activate", returnTo)}>{configuration === "configured" ? "Review connection action" : "Continue to activation"}</Link>}</footer>
          </section>
          <section className={styles.sideCard}><h2>What this unlocks</h2><p className={styles.unlock}><StatusIcon passed={supported.length > 0} /><span><strong>Source evidence</strong><small>Supported provider facts can join the evidence spine.</small></span></p><p className={styles.unlock}><StatusIcon passed={configuration === "configured"} warning /><span><strong>Operational freshness</strong><small>Freshness appears only after a verified configuration returns data.</small></span></p><p className={styles.unlock}><StatusIcon passed={operational === "healthy"} warning /><span><strong>Trusted source health</strong><small>{operational === "healthy" ? "The source can currently contribute verified facts." : "Blocked until the live operational signal is healthy."}</small></span></p></section>
        </div>
      ) : null}

      {active === "activate" ? (
        <div className={styles.twoColumn}>
          <section className={`${styles.card} ${styles.connectCard}`}>
            <header className={styles.cardHeader}><div><h2>{configuration === 'configured' ? `Manage ${providerName}` : `Activate ${providerName}`}</h2><p>This is the only step that can start, repair, retry or stop a provider connection.</p></div></header>
            <p className={styles.truthNote}><i />Authorization, verification, returned data and operational health remain separate outcomes after this action.</p>
            <div className={styles.connectionActions}>
              {planned ? <p>Connection is unavailable until provider authentication and runtime support are implemented.</p> : <ConnectionActions providerId={providerId} providerName={providerName} configuration={configuration} operational={operational} badge={badge} note={connectionNote} canManage={canManage} returnTo={returnTo} />}
            </div>
          </section>
          <section className={styles.sideCard}><h2>Before you act</h2><p>Provider access can leave Unauth. Review the named provider, workspace scope, permissions and retained-record consequence in the action boundary.</p><p className={styles.limit}><i data-tone="positive" />Cancelling or going back does not change connection state.</p></section>
        </div>
      ) : null}
    </div>
  );
}
