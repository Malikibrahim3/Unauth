"use client";

import Link from "next/link";
import { ConnectionActions } from "@/components/integrations/ConnectionActions";
import type {
  ConnectionConfigurationState,
  ConnectionOperationalState,
} from "@/lib/connections/readModel";
import type { EffectiveConnectionBadge } from "@/lib/connections/effectiveStatus";
import type { CSSProperties } from 'react';

const styles: Record<string, CSSProperties> = {
  root: { height: '100%', minHeight: 0, display: 'flex', gap: 16 },
  progressCard: { width: 230, flex: '0 0 230px', minHeight: 0, overflowY: 'auto', borderRadius: 13, background: '#f4f3f1', padding: 12 },
  progress: { height: '100%', display: 'flex', flexDirection: 'column', gap: 2, margin: 0, padding: 0, listStyle: 'none' },
  stageButton: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 8px', borderRadius: 9, color: '#64686d', fontSize: 10.5, textDecoration: 'none' },
  stageNumber: { width: 17, height: 17, display: 'grid', placeItems: 'center', flex: '0 0 17px', marginTop: 1, borderRadius: '50%', background: '#fff', boxShadow: 'inset 0 0 0 1.5px #ddd8d1', font: "400 9px/1 'IBM Plex Mono',monospace" },
  twoColumn: { flex: 1, minWidth: 0, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 290px', gap: 12, alignItems: 'start', overflowY: 'auto' },
  card: { overflow: 'hidden', border: '1px solid #e4e3e0', borderRadius: 12, background: '#fff' },
  connectCard: { padding: 16 },
  sideCard: { padding: 15, borderRadius: 12, background: '#f4f3f1' },
  sideStack: { display: 'grid', gap: 12 },
  identity: { display: 'flex', alignItems: 'flex-start', gap: 11 },
  providerOverview: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '8px 12px', margin: '14px 0 0', fontSize: 11.5 },
  truthNote: { display: 'flex', gap: 8, margin: '14px 0 0', padding: 10, borderRadius: 9, background: '#fff3e9', color: '#7a5310', fontSize: 11.5, lineHeight: '16px' },
  limit: { display: 'flex', gap: 8, margin: '9px 0 0', color: '#64686d', fontSize: 11, lineHeight: '16px' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderBottom: '1px solid #eae8e5' },
  mappingHeader: { display: 'grid', gridTemplateColumns: '1fr 24px 1fr 80px', gap: 10, padding: '8px 14px', borderBottom: '1px solid #e4e3e0', color: '#6f6a63', fontSize: 10 },
  mappingRows: { display: 'grid' },
  mappingRow: { display: 'grid', gridTemplateColumns: '1fr 24px 1fr 80px', gap: 10, alignItems: 'center', minHeight: 42, padding: '7px 14px', borderBottom: '1px solid #f4f2ef', fontSize: 11 },
  mappingTarget: { color: '#40454a', fontFamily: "'IBM Plex Mono',monospace" },
  cardNote: { display: 'flex', gap: 8, margin: 0, padding: '10px 14px', borderTop: '1px solid #eae8e5', background: '#ffffff', color: '#6f6a63', fontSize: 10.5, lineHeight: '15px' },
  pill: { display: 'inline-flex', width: 'fit-content', padding: '3px 6px', borderRadius: 5, background: '#f2f0ed', color: '#40454a', fontSize: 9.5 },
  statusIcon: { width: 18, height: 18, display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#f2f0ed', color: '#40454a' },
  fieldLabel: { marginTop: 16, color: '#6f6a63', fontSize: 10, fontWeight: 600, letterSpacing: '.08em' },
  scopeList: { display: 'grid', gap: 7, marginTop: 9 },
  connectionActions: { display: 'grid', gap: 10, marginTop: 14 },
  credential: { display: 'flex', gap: 8, margin: '9px 0 0', color: '#64686d', fontSize: 11, lineHeight: '16px' },
  backfillCard: { flex: 1, minWidth: 0, minHeight: 0 }, backfillRows: { display: 'grid' }, empty: { margin: 0, padding: 20, color: '#64686d', fontSize: 12 },
  checks: { display: 'grid' },
  verifyFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderTop: '1px solid #eae8e5', background: '#ffffff', color: '#6f6a63', fontSize: 10.5 },
  unlock: { display: 'flex', gap: 9, margin: '10px 0 0' },
};

type Capability = { id: string; description: string; support: string; level?: string; availability?: string };

function operationLabel(level?: string) {
  switch (level) {
    case 'read': return 'Read provider records';
    case 'sync': return 'Import provider records';
    case 'subscribe': return 'Receive provider events';
    case 'link': return 'Open a manual handoff';
    case 'write': return 'Write provider records';
    case 'act': return 'Perform a provider action';
    default: return 'Operation not specified';
  }
}
const STEPS = ["provider", "permissions", "mapping", "history", "schedule", "review", "activate"] as const;
type StepId = (typeof STEPS)[number];

function CheckGlyph({ size = 10 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 5.2 4.1 7.3 8 3.2"/></svg>;
}

function AlertGlyph({ size = 11 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 1.5 11 10.2H1Z"/><path d="M6 4.2v2.7M6 8.7v.1"/></svg>;
}

function ProviderGlyph({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5.2 9 2l6 3.2v7.5L9 16l-6-3.3Z"/><path d="m3 5.2 6 3.3 6-3.3M9 8.5V16"/></svg>;
}

function ShieldGlyph({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 1.7 11.4 3.4v3.2c0 2.6-1.6 4.6-4.4 5.7-2.8-1.1-4.4-3.1-4.4-5.7V3.4Z"/><path d="m4.8 6.8 1.4 1.4 3-3"/></svg>;
}

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
  return <span style={styles.pill} data-tone={tone}>{children}</span>;
}

function StatusIcon({ passed, warning = false }: { passed: boolean; warning?: boolean }) {
  return <span style={styles.statusIcon} data-tone={passed ? "positive" : warning ? "warning" : "neutral"}>{passed ? <CheckGlyph size={11} /> : warning ? <AlertGlyph size={11} /> : "·"}</span>;
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
  const localCapability = providerId === 'self_fulfillment_pack';
  const planned = stage === "planned" || (!connectEnabled && !localCapability);
  const supported = capabilities.filter((capability) => capability.support !== "unsupported");
  const unsupported = capabilities.filter((capability) => capability.support === "unsupported");
  const stageDefinitions: Array<{ id: StepId; label: string; meta: string }> = [
    { id: "provider", label: "Provider", meta: providerName },
    { id: "permissions", label: "Permissions", meta: "operation and access boundary" },
    { id: "mapping", label: "Mapping", meta: `${supported.length} supported capabilities · samples unverified` },
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
    <div style={styles.root} data-source-setup data-testid="source-setup-wizard" data-state-id="generic-seven-step-source-setup" data-setup-state={planned ? "planned" : active}>
      <section style={styles.progressCard}>
        <ol style={styles.progress} aria-label={`${providerName} setup stages`}>
          {stageDefinitions.map((step, index) => {
            const complete = step.id === 'permissions' && configuration === 'configured';
            const current = index === activeIndex;
            return (
              <li key={step.id}>
                <Link href={stageHref(providerId, step.id, returnTo)} style={{ ...styles.stageButton, background: current ? '#fff' : undefined, boxShadow: current ? '0 1px 2px rgba(28,27,25,.05),0 0 0 1px rgba(28,27,25,.06)' : undefined }} aria-current={current ? "step" : undefined} data-current={current}>
                  <span style={{ ...styles.stageNumber, background: complete ? '#1c1f23' : '#fff', boxShadow: complete ? 'none' : current ? 'inset 0 0 0 2px #ff7a30' : 'inset 0 0 0 1.5px #ddd8d1', color: complete ? '#fff' : current ? '#1c1f23' : '#64686d' }} data-state={complete ? "complete" : current ? "current" : "pending"}>{complete ? <CheckGlyph size={12} /> : index + 1}</span>
                  <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', font: `${current ? 500 : 400} 12.5px/1.3 'Inter',sans-serif`, color: complete || current ? '#1c1f23' : '#64686d' }}>{step.label}</strong><small style={{ display: 'block', marginTop: 3, font: "400 10.5px/1.45 'Inter',sans-serif", color: step.id === 'schedule' && planned ? '#b0431a' : '#64686d' }}>{step.meta}</small></span>
                </Link>
              </li>
            );
          })}
          <li style={{ flex: 1 }}/>
          <li style={{ padding: '10px 8px', borderTop: '1px solid #e4e3e0', marginTop: 6, font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>Viewing these steps does not change provider access. Existing connections continue to operate until explicitly disconnected.</li>
        </ol>
      </section>

      {active === "provider" ? (
        <div tabIndex={0} style={styles.twoColumn}>
          <section style={{...styles.card,...styles.connectCard}}>
            <div style={styles.identity}><span><ProviderGlyph size={18} /></span><div><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>{providerName}</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>{description}</p></div></div>
            <dl style={styles.providerOverview}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Product availability</dt><dd>{planned ? 'Not available yet' : stage === 'partial' ? 'Partial' : stage === 'beta' ? 'Beta' : 'Available'}</dd></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Workspace configuration</dt><dd>{configuration === 'configured' ? 'Configured' : 'Not configured'}</dd></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Current usability</dt><dd>{operational === 'unknown' ? 'Unavailable' : operational}</dd></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Delivery</dt><dd>{deliveryLabel(deliveryModel)}</dd></div>
            </dl>
            <p style={styles.truthNote}><i />Choosing a provider does not authorize it, prove credentials, return records, or establish source health.</p>

          </section>
          <section style={styles.sideCard}><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>What this setup preserves</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>These steps explain provider identity, permissions, mapping, history, schedule, recorded checks and connection actions.</p><p style={styles.limit}><i />This route shows recorded connection state. Viewing a step does not save or verify provider work.</p><p style={styles.limit}><i data-tone="positive" />Authorisation actions open the provider-owned connection flow. Review its permissions before continuing.</p></section>
        </div>
      ) : null}

      {active === "mapping" ? (
        <div tabIndex={0} style={styles.twoColumn}>
          <section style={styles.card}>
            <header style={styles.cardHeader}>
              <div><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>Field mapping</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>{providerName} capabilities on the left, the canonical Unauth fact each one supplies on the right</p></div>
              <StatePill tone="neutral">{supported.length} of {capabilities.length} supported · samples unverified</StatePill>
            </header>
            <div style={styles.mappingHeader}><span>{providerName} field</span><span /><span>Unauth field</span><span>State</span></div>
            <div style={styles.mappingRows}>
              {capabilities.map((capability) => {
                const mapped = capability.support !== "unsupported";
                return (
                  <div style={styles.mappingRow} key={capability.id}>
                    <span><code>{capability.id}</code><small style={{ display: 'block', marginTop: 4, lineHeight: 1.5 }}>Sample values are not available in this setup view</small></span>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.2 6.5h8.2M7.6 3.7l2.8 2.8-2.8 2.8"/></svg>
                    <span style={styles.mappingTarget}>{mapped ? capability.id : "Not available"}</span>
                    <StatePill tone="neutral">{mapped ? "Supported" : "No source"}</StatePill>
                  </div>
                );
              })}
            </div>
            <p style={styles.cardNote}><i />{unsupported.length ? `${unsupported.length} capability ${unsupported.length === 1 ? "family is" : "families are"} unavailable. Unauth leaves those facts unavailable rather than inferring them.` : "Every declared adapter capability has a canonical target. Authorisation alone does not verify live samples."}</p>
          </section>

          <aside style={styles.sideStack}>
            <section style={styles.sideCard}><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>Sample preview</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>This setup view does not load sample records. Open source detail for retained import observations.</p><dl><div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Provider</dt><dd>{providerName}</dd></div><div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Delivery</dt><dd>{deliveryLabel(deliveryModel)}</dd></div><div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Configuration</dt><dd>{configuration === "configured" ? "Recorded" : "Unavailable"}</dd></div><div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Operational state</dt><dd>{operational === "unknown" ? "Unavailable" : operational}</dd></div></dl></section>
            <section style={styles.sideCard}><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>Capability limits</h2>{unsupported.length ? unsupported.map((capability) => <p style={styles.limit} key={capability.id}><i />{capability.description} is not supplied by this connector.</p>) : <p style={styles.limit}><i data-tone="positive" />No unsupported capability is declared. Provider-specific API limits still apply.</p>}<p style={styles.limit}><i />Historical windows and row counts remain unavailable until the live account confirms them.</p></section>
          </aside>
        </div>
      ) : null}

      {active === "permissions" ? (
        <div tabIndex={0} style={styles.twoColumn}>
          <section style={{...styles.card,...styles.connectCard}}>
            <div style={styles.identity}><span><ProviderGlyph size={18} /></span><div><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>Connect {providerName}</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>{description}</p></div></div>
            <div style={styles.fieldLabel}>Declared operations</div>
            <div style={styles.scopeList}>
              {capabilities.map((capability) => {
                const supportedOperation = capability.support !== "unsupported";
                return <div key={capability.id} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr) auto', gap: 9, alignItems: 'start', padding: '9px 0', borderBottom: '1px solid #eae8e5', font: "400 12px/1.5 'Inter',sans-serif" }}><StatusIcon passed={false} /><span style={{ display: 'block', minWidth: 0 }}><strong style={{ display: 'block' }}>{capability.description}</strong><small style={{ display: 'block', marginTop: 4, lineHeight: 1.5 }}>{supportedOperation ? operationLabel(capability.level) : "Not available through this adapter"}</small></span><StatePill tone="neutral">{supportedOperation ? capability.support === "partial" ? "Partial support" : "Supported" : "Unsupported"}</StatePill></div>;
              })}
              <div><StatusIcon passed={false} /><span style={{ display: 'block', minWidth: 0 }}><strong style={{ display: 'block' }}>Customer and money actions</strong><small style={{ display: 'block', marginTop: 4, lineHeight: 1.5 }}>Connecting a source does not enable refunds, replacement orders, claim submissions or customer messages. Each action needs its own verified release and merchant approval.</small></span><StatePill tone="neutral">Not enabled</StatePill></div>
            </div>
            <p style={styles.truthNote}><i />Declared support is not granted access or completed verification. The connection action shows its requested permissions; retained grants appear in source detail. Credentials are not rendered here.</p>
            <div style={styles.connectionActions}><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>{planned ? 'Connection is unavailable until provider authentication and runtime support are implemented.' : 'Review these permissions now. Opening the final step does not send a provider request; its connection action requires a separate confirmation.'}</p></div>
          </section>
          <section style={styles.sideCard}><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>Credential handling</h2><p style={styles.credential}><ShieldGlyph size={14} />Credentials are entered through the provider-specific connection flow.</p><p style={styles.credential}><ShieldGlyph size={14} />Unauth stores provider identifiers required for the connection, not a merchant password.</p><p style={styles.credential}><ShieldGlyph size={14} />Disconnecting stops future ingestion through this connection. Previously imported records and their history remain retained.</p></section>
        </div>
      ) : null}

      {active === "history" ? (
        <section style={{...styles.card,...styles.backfillCard}}>
          <header style={styles.cardHeader}><div><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>Backfill history</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>Unauth reads history before it states any figure from this source</p></div></header>
          <div style={styles.backfillRows}>
            {supported.slice(0, 3).map((capability) => <div key={capability.id}><span style={{ display: 'block', minWidth: 0 }}><strong style={{ display: 'block' }}>{capability.description}</strong><small style={{ display: 'block', marginTop: 4, lineHeight: 1.5 }}>Available range is confirmed after authorisation</small></span><b>Unavailable</b><i data-unavailable="true" /></div>)}
            {!supported.length ? <p style={styles.empty}>No supported history family is available for this connector.</p> : null}
          </div>
          <p style={styles.cardNote}><i />Historical totals, progress and reconciliation remain unavailable until the provider completes a real backfill. Partial reads must retain their explicit coverage limits.</p>
        </section>
      ) : null}

      {active === "schedule" ? (
        <div tabIndex={0} style={styles.twoColumn}>
          <section style={{...styles.card,...styles.connectCard}}>
            <header style={styles.cardHeader}><div><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>Sync schedule</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>Delivery timing remains provider-owned and separate from freshness.</p></div></header>
            <dl style={styles.providerOverview}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Delivery model</dt><dd>{deliveryLabel(deliveryModel)}</dd></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Latest operational state</dt><dd>{operational === 'unknown' ? 'Unavailable' : operational}</dd></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Freshness proof</dt><dd>{operational === 'healthy' ? 'Measured by latest live signal' : 'Not verified as healthy'}</dd></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12 }}><dt>Missed delivery behavior</dt><dd>Shown as stale, delayed, or unavailable</dd></div>
            </dl>
            <p style={styles.cardNote}><i />A schedule does not guarantee a completed sync. Source detail retains attempts, returned rows, failures and latest data separately.</p>
          </section>
          <section style={styles.sideCard}><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>Saved-input clarity</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>This adapter owns its schedule. No unsaved schedule choice is collected on this step.</p><p style={styles.limit}><i />Provider-specific controls appear only where the shipped adapter supports them.</p></section>
        </div>
      ) : null}

      {active === "review" ? (
        <div tabIndex={0} style={styles.twoColumn}>
          <section style={styles.card}>
            <header style={styles.cardHeader}><div><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>Verification checks</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>Declared adapter support, recorded configuration and measured health are separate checks</p></div></header>
            <div style={styles.checks}>{checks.map((check) => <div key={check.label}><StatusIcon passed={check.passed} warning={!check.passed} /><span style={{ display: 'block', minWidth: 0 }}><strong style={{ display: 'block' }}>{check.label}</strong><small style={{ display: 'block', marginTop: 4, lineHeight: 1.5 }}>{check.detail}</small></span><StatePill tone={check.passed ? "positive" : "warning"}>{check.passed ? "Passed" : "Blocked"}</StatePill></div>)}</div>
            <footer style={styles.verifyFooter}><span>{passedChecks} of {checks.length} checks recorded · this checklist does not verify samples, historical coverage or every object family{planned ? ' · connection unavailable' : ''}</span>{planned ? null : <Link href={stageHref(providerId, "activate", returnTo)}>{configuration === "configured" ? "Review connection action" : "Continue to activation"}</Link>}</footer>
          </section>
          <section style={styles.sideCard}><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>What this unlocks</h2><p style={styles.unlock}><StatusIcon passed={supported.length > 0} /><span style={{ display: 'block', minWidth: 0 }}><strong style={{ display: 'block' }}>Source evidence</strong><small style={{ display: 'block', marginTop: 4, lineHeight: 1.5 }}>Supported provider facts can join the evidence spine.</small></span></p><p style={styles.unlock}><StatusIcon passed={configuration === "configured"} warning /><span style={{ display: 'block', minWidth: 0 }}><strong style={{ display: 'block' }}>Operational freshness</strong><small style={{ display: 'block', marginTop: 4, lineHeight: 1.5 }}>Object-family freshness requires its own observed records; configuration alone is insufficient.</small></span></p><p style={styles.unlock}><StatusIcon passed={operational === "healthy"} warning /><span style={{ display: 'block', minWidth: 0 }}><strong style={{ display: 'block' }}>Trusted source health</strong><small style={{ display: 'block', marginTop: 4, lineHeight: 1.5 }}>{operational === "healthy" ? "The source can currently contribute verified facts." : "Blocked until the live operational signal is healthy."}</small></span></p></section>
        </div>
      ) : null}

      {active === "activate" ? (
        <div tabIndex={0} style={styles.twoColumn}>
          <section style={{...styles.card,...styles.connectCard}}>
            <header style={styles.cardHeader}><div><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>{configuration === 'configured' ? `Manage ${providerName}` : `Activate ${providerName}`}</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>This is the only step that can start, repair, retry or stop a provider connection.</p></div></header>
            <p style={styles.truthNote}><i />Authorization, verification, returned data and operational health remain separate outcomes after this action.</p>
            <div style={styles.connectionActions}>
              {planned ? <p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>Connection is unavailable until provider authentication and runtime support are implemented.</p> : <ConnectionActions providerId={providerId} providerName={providerName} configuration={configuration} operational={operational} badge={badge} note={connectionNote} canManage={canManage} returnTo={returnTo} />}
            </div>
          </section>
          <section style={styles.sideCard}><h2 style={{ margin: 0, font: "500 14px/1.4 'Inter',sans-serif" }}>Before you act</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>Provider access can leave Unauth. Review the named provider, workspace scope, permissions and retained-record consequence in the action boundary.</p><p style={styles.limit}><i data-tone="positive" />Cancelling or going back does not change connection state.</p></section>
        </div>
      ) : null}
    </div>
  );
}
