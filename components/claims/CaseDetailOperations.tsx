'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useBreadcrumbDetail, useBreadcrumbLabel } from '@/components/layout/BreadcrumbOverrideContext';
import type { CaseFinancialSummary } from '@/components/claims/payout/CaseFinancialHistoryCard';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import type { Decision, EvidenceSource, EvidenceType } from '@/components/claims/claimReviewTypes';
import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  EVIDENCE_SOURCE_LABELS,
  EVIDENCE_TYPE_LABELS,
  STATUS_LABELS,
} from '@/components/claims/claimReviewLabels';
import type { CaseActivity, CaseEvidenceFile } from '@/lib/claims/caseEvidenceFile';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import { hashId } from '@/lib/ui/displayRef';
import { formatMajorUnitInput } from '@/lib/ui/merchantCopy';
import { formatDayMonthInTimeZone, formatMinorCurrencyNullable, formatTimeInTimeZone } from '@/lib/utils/format';
import { ClaimReviewManageCard } from '@/components/claims/ClaimReviewManageCard';
import { CaseInvestigationsCard } from '@/components/claims/investigations/CaseInvestigationsCard';
import { DeliveryPhotoFinding } from '@/components/claims/investigations/DeliveryPhotoFinding';
import { Modal } from '@/components/ui/Modal';

export type CaseDetailTab =
  | 'evidence'
  | 'recommendation'
  | 'decisions'
  | 'recovery'
  | 'financial'
  | 'audit';

export type CaseDetailAction = 'decision' | 'snooze' | 'request-evidence' | null;

const TABS: Array<{ key: CaseDetailTab; label: string }> = [
  { key: 'evidence', label: 'Evidence' },
  { key: 'recommendation', label: 'Recommendation' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'financial', label: 'Financial' },
  { key: 'audit', label: 'Audit' },
];

const DECISIONS: Decision[] = [
  'approved',
  'partial_refund',
  'full_refund',
  'denied',
  'escalated',
  'chargeback_disputed',
  'internal_watch',
  'no_action',
];

const EVIDENCE_TYPES = Object.keys(EVIDENCE_TYPE_LABELS) as EvidenceType[];
const EVIDENCE_SOURCES = Object.keys(EVIDENCE_SOURCE_LABELS) as EvidenceSource[];

const ink = '#1c1f23';
const body = '#40454a';
const muted = '#64686d';
const faint = '#64686d';
const grouped = '#f4f3f1';
const line = '#eae8e5';
const orange = '#ff7a30';
const orangeText = '#9b470d';
const amber = '#c98a1a';
const amberText = '#7a5310';
const red = '#b0431a';
const green = '#1a7f4b';
const blue = '#4a90d9';
const mono = "'IBM Plex Mono',monospace";
const sans = "'Inter',sans-serif";
const panelShadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function human(value: string | null | undefined, fallback = 'Unavailable') {
  if (!value?.trim()) return fallback;
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function caseReference(id: string) {
  return `CASE-${hashId(id).replace('#', '')}`;
}

function recoveryReference(id: string | null | undefined) {
  return id ? `RECOV-${hashId(id).replace('#', '')}` : 'RECOVERY NOT OPENED';
}

function compactDate(value: string | null | undefined, includeTime = false) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = formatDayMonthInTimeZone(date, 'UTC');
  if (!includeTime) return datePart;
  const timePart = formatTimeInTimeZone(date, 'UTC');
  return `${datePart} ${timePart}`;
}

function timelineDate(value: string | null | undefined) {
  if (!value) return { day: 'time', time: 'unavailable' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: value, time: '' };
  return {
    day: formatDayMonthInTimeZone(date, 'UTC'),
    time: formatTimeInTimeZone(date, 'UTC'),
  };
}

function money(value: number | null | undefined, currency: string | null | undefined) {
  return value == null || !currency ? 'unavailable' : formatMinorCurrencyNullable(value, currency);
}

function tabFromUrl(value: string | null): CaseDetailTab {
  if (value === 'responsibility') return 'recommendation';
  if (value === 'activity') return 'audit';
  return TABS.some((tab) => tab.key === value) ? value as CaseDetailTab : 'evidence';
}

function normaliseInvestigationId(value: string | null | undefined): string | null {
  if (!value) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })().trim();
  return decoded && decoded.length <= 200 && /^[a-zA-Z0-9_-]+$/.test(decoded)
    ? decoded
    : null;
}

function recommendationLabel(value: string | null) {
  const labels: Record<string, string> = {
    approve_payout: 'Approve the requested payout',
    deny_under_policy: 'Deny the request under policy',
    request_customer_evidence: 'Request evidence from the customer',
    ask_carrier_for_clarification: 'Ask the carrier for clarification',
    ask_3pl_for_clarification: 'Ask the 3PL for clarification',
    ask_supplier_for_clarification: 'Ask the supplier for clarification',
    escalate_internal_review: 'Escalate for internal review',
    open_recovery: 'Open a recovery route',
    wait_for_response: 'Wait for the source response',
    close_case: 'Close the case',
  };
  return value ? labels[value] ?? human(value) : 'Recommendation unavailable';
}

function sourceLabel(value: string | null | undefined) {
  if (!value) return 'source unavailable';
  const lower = value.toLowerCase();
  if (lower.includes('shopify_payment')) return 'S. Payments';
  if (lower.includes('shopify')) return 'Shopify';
  if (lower.includes('gorgias')) return 'Gorgias';
  if (lower.includes('ups')) return 'UPS';
  if (lower.includes('fedex')) return 'FedEx';
  if (lower.includes('dpd')) return 'DPD';
  if (lower.includes('shipbob')) return 'ShipBob';
  if (lower.includes('unauth')) return 'Unauth';
  return human(value);
}

function buttonStyle(primary = false, disabled = false): React.CSSProperties {
  return {
    padding: '8px 12px',
    border: 0,
    borderRadius: 9,
    background: primary ? ink : '#ffffff',
    boxShadow: primary ? undefined : 'inset 0 0 0 1px rgba(28,27,25,.1)',
    color: primary ? '#ffffff' : ink,
    font: `500 12.5px/1 ${sans}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? .45 : 1,
  };
}

function fieldStyle(): React.CSSProperties {
  return {
    width: '100%',
    border: 0,
    borderRadius: 9,
    background: '#ffffff',
    boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.12)',
    padding: '9px 10px',
    color: ink,
    font: `400 12px/1.4 ${sans}`,
    outline: 'none',
  };
}

function SectionHeading({ icon, title, note }: { icon: ReactNode; title: string; note?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 4px 0' }}>
      {icon}
      <span style={{ flex: 1, font: `600 10.5px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>{title}</span>
      {note ? <span style={{ font: `400 10px/1 ${mono}`, color: faint }}>{note}</span> : null}
    </div>
  );
}

function DocumentIcon() {
  return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.4 1.9h4.3l2.9 2.9v7.3H3.4Z"/><path d="M5.2 7.6h3.6M5.2 9.6h2.4"/></svg>;
}

function ClockIcon() {
  return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="M7 4.2V7l2 1.4"/></svg>;
}

function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.4 7h9.2M7 2.4v9.2"/></svg>;
}

function MoneyIcon() {
  return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="M8.6 4.9H6.4a1.3 1.3 0 0 0 0 2.6h1.2a1.3 1.3 0 0 1 0 2.6H5.4"/></svg>;
}

function EmptySourceRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 11 }}>
      <div style={{ width: 74, flex: 'none', font: `400 10.5px/1.4 ${mono}`, color: faint }}>source<br/>unavailable</div>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d4cfc8', marginTop: 4, flex: 'none' }}/>
      <div style={{ flex: 1, minWidth: 0, font: `400 11.5px/1.5 ${sans}`, color: muted }}>{children}</div>
    </div>
  );
}

function TimelineRows({ activity, limit }: { activity: CaseActivity[]; limit?: number }) {
  const rows = typeof limit === 'number' ? activity.slice(0, limit) : activity;
  if (!rows.length) return <EmptySourceRow>No append-only activity is available for this case.</EmptySourceRow>;
  return rows.map((entry) => {
    const when = timelineDate(entry.occurredAt);
    const tag = entry.kind === 'recommendation'
      ? 'RULE'
      : entry.kind === 'source'
        ? 'SOURCE'
        : entry.kind === 'merchant_confirmation'
          ? 'MERCHANT'
          : entry.kind === 'submission'
            ? 'SUBMISSION'
            : entry.kind === 'provider_response'
              ? 'RESPONSE'
              : entry.kind === 'credit'
                ? 'CREDIT'
                : entry.kind === 'external_action'
                  ? 'HANDOFF'
                  : entry.kind === 'external_outcome'
                    ? 'OUTCOME'
                    : entry.kind === 'finding'
                      ? 'FINDING'
                      : 'AUDIT';
    const dot = entry.kind === 'recommendation'
      ? orange
      : entry.kind === 'source' || entry.kind === 'external_outcome'
        ? blue
        : entry.kind === 'credit'
          ? green
          : '#d4cfc8';
    return (
      <div key={entry.id} style={{ display: 'flex', gap: 11 }}>
        <div style={{ width: 74, flex: 'none', font: `400 10.5px/1.4 ${mono}`, color: faint }}>{when.day}<br/>{when.time}</div>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, marginTop: 4, flex: 'none' }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `500 12px/1.4 ${sans}`, color: ink }}>{entry.title}</div>
          <div style={{ font: `400 11px/1.5 ${sans}`, color: muted }}>{entry.summary}</div>
        </div>
        <span style={{ padding: '2px 6px', borderRadius: 5, background: grouped, font: `500 9.5px/1.5 ${sans}`, color: body, flex: 'none' }}>{tag}</span>
      </div>
    );
  });
}

function ProviderGates({ file }: { file: CaseEvidenceFile }) {
  const evidenceById = new Map(file.evidence.map((entry) => [entry.id, entry]));
  return (
    <div style={{ flex: 'none', background: grouped, borderRadius: 13, padding: 11, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionHeading icon={<DocumentIcon/>} title="PROVIDER GATES" note="observed facts only"/>
      <div style={{ background: '#ffffff', borderRadius: 10, boxShadow: panelShadow, padding: '12px 13px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '9px 14px' }}>
        {file.providerClaimReadiness.gates.map((gate) => {
          const evidence = gate.evidenceIds.map((id) => evidenceById.get(id)).find(Boolean);
          const met = gate.state === 'met' || gate.state === 'not_applicable';
          const gateColor = met ? green : gate.state === 'expired' || gate.state === 'conflicting' ? red : amber;
          const descriptor = evidence ? sourceLabel(evidence.system) : human(gate.state, 'unavailable').toLowerCase();
          const content = <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', font: `400 11.5px/1.3 ${sans}`, color: body }}>{gate.headline}</span>;
          return (
            <div key={gate.id} title={gate.reason} style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <span style={{ width: 6, height: 6, flex: 'none', borderRadius: '50%', background: gateColor }}/>
              {file.claim.orderId && ['shipment_identity', 'value_substantiated', 'amount_bounded'].includes(gate.id)
                ? <Link href={`/orders/${encodeURIComponent(file.claim.orderId)}`} style={{ flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none', overflow: 'hidden' }}>{content}</Link>
                : content}
              <span style={{ flex: 'none', font: `400 10px/1 ${mono}`, color: met ? faint : gateColor }}>{descriptor}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceTimeline({ file, expanded = false }: { file: CaseEvidenceFile; expanded?: boolean }) {
  const limit = expanded ? undefined : 7;
  return (
    <div style={{ flex: 1, minHeight: 0, background: grouped, borderRadius: 13, padding: 11, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionHeading icon={<ClockIcon/>} title="AUDIT TIMELINE" note={`append-only · ${file.activity.length} ${file.activity.length === 1 ? 'event' : 'events'}`}/>
      <div style={{ flex: 1, minHeight: 0, background: '#ffffff', borderRadius: 10, boxShadow: panelShadow, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <TimelineRows activity={file.activity} limit={limit}/>
        <div style={{ flex: 1 }}/>
        <div style={{ paddingTop: 11, borderTop: `1px solid ${line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, font: `400 11px/1.4 ${sans}`, color: muted }}>Corrections append new events. Nothing here is edited or removed.</span>
          {!expanded && file.activity.length > 7 ? <span style={{ font: `500 11.5px/1 ${sans}`, color: orangeText }}>Show all {file.activity.length}</span> : null}
        </div>
      </div>
    </div>
  );
}

function TruthStrip({ file, financial }: { file: CaseEvidenceFile; financial: CaseFinancialSummary | null }) {
  const gateCount = file.providerClaimReadiness.gates.filter((gate) => gate.state === 'met' || gate.state === 'not_applicable').length;
  const confidenceScore = file.apparentResponsibility.confidence === 'known'
    ? 'known'
    : file.apparentResponsibility.confidence === 'likely'
      ? 'likely'
      : file.apparentResponsibility.confidence.replaceAll('_', ' ');
  const recovery = file.recoveryCase
    ? `${human(file.recoveryCase.provider_claim_stage ?? file.recoveryCase.status)}${file.submissions.length ? '' : ' · not sent'}`
    : human(file.providerClaimReadiness.readiness);
  return (
    <div style={{ flex: 'none', background: grouped, borderRadius: '0 13px 13px 13px', padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
      <div><div style={{ font: `600 9.5px/1 ${sans}`, letterSpacing: '.09em', color: faint, marginBottom: 6 }}>AT RISK</div><div style={{ font: `400 15px/1 ${mono}`, color: ink }}>{money(file.claim.amountAtRiskMinor ?? financial?.exposed_minor, file.claim.currency ?? financial?.currency)}</div></div>
      <div><div style={{ font: `600 9.5px/1 ${sans}`, letterSpacing: '.09em', color: faint, marginBottom: 6 }}>RESPONSIBILITY</div><div style={{ font: `400 13px/1 ${sans}`, color: ink }}>{human(file.apparentResponsibility.owner)} · conf. {confidenceScore}</div></div>
      <div><div style={{ font: `600 9.5px/1 ${sans}`, letterSpacing: '.09em', color: faint, marginBottom: 6 }}>RECOVERY</div><div style={{ font: `400 13px/1 ${sans}`, color: ink }}>{recovery}</div></div>
      <div><div style={{ font: `600 9.5px/1 ${sans}`, letterSpacing: '.09em', color: faint, marginBottom: 6 }}>EVIDENCE</div><div style={{ font: `400 13px/1 ${sans}`, color: gateCount === 9 ? ink : amber }}>{gateCount} of 9 gates met</div></div>
    </div>
  );
}

function GroupedCard({ title, note, children, flex = false }: { title: string; note?: string; children: ReactNode; flex?: boolean }) {
  return (
    <div style={{ flex: flex ? 1 : 'none', minHeight: flex ? 0 : undefined, background: grouped, borderRadius: 13, padding: 11, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionHeading icon={<DocumentIcon/>} title={title} note={note}/>
      <div style={{ flex: flex ? 1 : undefined, minHeight: flex ? 0 : undefined, background: '#ffffff', borderRadius: 10, boxShadow: panelShadow, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 10, overflow: flex ? 'hidden' : undefined }}>
        {children}
      </div>
    </div>
  );
}

function DetailRows({ rows }: { rows: Array<{ label: string; value: ReactNode; muted?: boolean }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ flex: 1, font: `400 11.5px/1.4 ${sans}`, color: row.muted ? muted : body }}>{row.label}</span>
          <span style={{ font: `400 11.5px/1 ${mono}`, color: row.muted ? muted : ink, textAlign: 'right' }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function RecommendationContent({ wb, file }: { wb: ClaimReviewWorkbench; file: CaseEvidenceFile }) {
  const payoutCase = object(wb.decisionData?.payoutCase);
  const nextAction = text(payoutCase.nextAction);
  const reason = text(payoutCase.nextActionReason);
  const evaluation = object(wb.decisionData?.evaluation);
  const ruleName = text(evaluation.rule_name) ?? text(object(payoutCase.matchedRule).name);
  const context = wb.decisionData?.context as ClaimDecisionContext | undefined;
  const score = context?.identity?.confidenceScore;
  return (
    <>
      <GroupedCard title="ADVISORY RECOMMENDATION" note={wb.decisionStale ? 'facts changed after evaluation' : 'no merchant decision implied'}>
        <div style={{ font: `400 10px/1 ${mono}`, letterSpacing: '.06em', color: faint }}>UNAUTH RECOMMENDS · ADVISORY</div>
        <div style={{ font: `500 16px/1.35 ${sans}`, color: ink }}>{recommendationLabel(nextAction)}</div>
        <div style={{ font: `400 11.5px/1.55 ${sans}`, color: muted }}>{reason ?? 'No current recommendation explanation is available.'}</div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 3 }}>
          <span style={{ padding: '3px 7px', borderRadius: 5, background: grouped, font: `500 9.5px/1.5 ${sans}`, color: body }}>{ruleName ?? 'NO MATCHED RULE'}</span>
          <span style={{ padding: '3px 7px', borderRadius: 5, background: grouped, font: `500 9.5px/1.5 ${sans}`, color: body }}>{score == null ? 'CONFIDENCE UNAVAILABLE' : `CONFIDENCE ${score.toFixed(2)}`}</span>
        </div>
      </GroupedCard>
      <GroupedCard title="APPARENT RESPONSIBILITY" note={file.apparentResponsibility.merchantConfirmed ? 'merchant confirmed' : 'not yet confirmed'} flex>
        <div style={{ font: `500 14px/1.35 ${sans}`, color: ink }}>{file.apparentResponsibility.headline}</div>
        <div style={{ font: `400 11.5px/1.55 ${sans}`, color: muted }}>{file.apparentResponsibility.explanation}</div>
        {file.apparentResponsibility.missingEvidence.length ? (
          <div style={{ borderRadius: 9, background: '#fff3e9', boxShadow: 'inset 0 0 0 1px rgba(201,138,26,.22)', padding: '10px 11px', display: 'flex', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: amber, marginTop: 4, flex: 'none' }}/>
            <span style={{ flex: 1, font: `400 11px/1.5 ${sans}`, color: amberText }}>{file.apparentResponsibility.missingEvidence.join(' · ')}</span>
          </div>
        ) : null}
        <div style={{ flex: 1 }}/>
        <div style={{ font: `400 10.5px/1.5 ${mono}`, color: faint }}>Recommendation evidence is advisory. Only a recorded merchant decision establishes the merchant's position.</div>
      </GroupedCard>
    </>
  );
}

function DecisionsContent({ wb, file }: { wb: ClaimReviewWorkbench; file: CaseEvidenceFile }) {
  const legacy = wb.latestOutcome;
  return (
    <>
      <GroupedCard title="MERCHANT DECISIONS" note="append-only authority record" flex>
        {file.decisions.length ? file.decisions.map((decision) => (
          <div key={decision.id} style={{ display: 'flex', gap: 11, padding: '9px 0', borderTop: `1px solid ${line}` }}>
            <div style={{ width: 92, flex: 'none', font: `400 10.5px/1.4 ${mono}`, color: faint }}>{compactDate(decision.effectiveAt ?? decision.recordedAt, true)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `500 12px/1.4 ${sans}`, color: ink }}>{decision.action ? human(decision.action) : DECISION_LABELS[decision.decision as Decision] ?? human(decision.decision)}</div>
              <div style={{ font: `400 11px/1.5 ${sans}`, color: muted }}>{decision.reason ?? 'No rationale was recorded.'}{decision.recommendationSnapshot?.comparison_version ? ` · ${String(decision.recommendationSnapshot.comparison_version)} snapshot retained` : ''}</div>
            </div>
            <span style={{ font: `400 10.5px/1 ${mono}`, color: body }}>{decision.amountMinor == null ? 'non-monetary' : money(decision.amountMinor, decision.currency)}</span>
          </div>
        )) : legacy ? (
          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}><div style={{ font: `500 12px/1.4 ${sans}`, color: ink }}>{DECISION_LABELS[legacy.decision as Decision] ?? human(legacy.decision)}</div><div style={{ font: `400 11px/1.5 ${sans}`, color: muted }}>Legacy decision record · source rationale unavailable</div></div>
          </div>
        ) : <EmptySourceRow>No merchant decision has been recorded.</EmptySourceRow>}
        <div style={{ flex: 1 }}/>
        <div style={{ paddingTop: 11, borderTop: `1px solid ${line}`, font: `400 11px/1.4 ${sans}`, color: muted }}>Reversals append a correcting record. The original decision is never edited or removed.</div>
      </GroupedCard>
      <GroupedCard title="EXTERNAL RESULT" note="observed source outcomes only">
        {file.outcomes.length ? file.outcomes.slice(0, 4).map((outcome) => (
          <div key={outcome.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ flex: 1, font: `400 11.5px/1.4 ${sans}`, color: body }}>{human(outcome.outcomeType)}</span>
            <span style={{ font: `400 11px/1 ${mono}`, color: outcome.state === 'observed_failed' ? red : ink }}>{human(outcome.state)} · {sourceLabel(outcome.sourceSystem)}</span>
          </div>
        )) : <div style={{ font: `400 11.5px/1.5 ${sans}`, color: muted }}>No provider or payment outcome has been observed. A decision or prepared handoff is not an external result.</div>}
      </GroupedCard>
    </>
  );
}

function RecoveryContent({ file }: { file: CaseEvidenceFile }) {
  const recovery = file.recoveryCase;
  const latestPack = file.claimPacks[0] ?? null;
  const latestSubmission = file.submissions[0] ?? null;
  const latestResponse = file.providerResponses[0] ?? null;
  return (
    <>
      <GroupedCard title="RECOVERY ROUTE" note={recovery ? recoveryReference(recovery.id) : 'not opened'}>
        {recovery ? (
          <>
            <DetailRows rows={[
              { label: 'Owner', value: recovery.partner?.name ?? human(recovery.owner_type) },
              { label: 'Current stage', value: human(recovery.provider_claim_stage ?? recovery.status) },
              { label: 'Amount sought', value: money(recovery.amount_sought_minor, recovery.currency) },
              { label: 'Deadline', value: recovery.deadline_at ? compactDate(recovery.deadline_at) : 'unavailable' },
            ]}/>
            <div style={{ height: 1, background: line }}/>
            <div style={{ font: `400 11.5px/1.5 ${sans}`, color: muted }}>{file.providerClaimReadiness.nextAction}</div>
          </>
        ) : <div style={{ font: `400 11.5px/1.5 ${sans}`, color: muted }}>No recovery route has been opened. This does not mean the loss is unrecoverable.</div>}
      </GroupedCard>
      <GroupedCard title="CLAIM, RESPONSE & CREDIT" note="each stage remains separate" flex>
        <DetailRows rows={[
          { label: 'Claim pack', value: latestPack ? `${human(latestPack.state)} · v${latestPack.pack_version}` : 'unavailable', muted: !latestPack },
          { label: 'Sent', value: latestSubmission ? compactDate(latestSubmission.submitted_at, true) : 'not recorded', muted: !latestSubmission },
          { label: 'Provider position', value: latestResponse ? human(latestResponse.liability_position) : 'not recorded', muted: !latestResponse },
          { label: 'Approved', value: latestResponse?.approved_amount_minor == null ? 'unavailable' : money(latestResponse.approved_amount_minor, latestResponse.currency), muted: latestResponse?.approved_amount_minor == null },
          { label: 'Received', value: latestResponse?.credited_amount_minor == null ? 'unavailable' : money(latestResponse.credited_amount_minor, latestResponse.currency), muted: latestResponse?.credited_amount_minor == null },
          { label: 'Reconciled', value: recovery?.provider_claim_stage === 'reconciled' ? 'recorded' : 'unavailable', muted: recovery?.provider_claim_stage !== 'reconciled' },
        ]}/>
        <div style={{ flex: 1 }}/>
        <div style={{ font: `400 10.5px/1.5 ${mono}`, color: faint }}>Provider approval, receipt, matching, and reconciliation remain separate recorded stages.</div>
      </GroupedCard>
    </>
  );
}

function FinancialContent({ summaries, currency }: { summaries: CaseFinancialSummary[]; currency: string | null }) {
  const summary = summaries.find((row) => row.currency === currency) ?? summaries[0] ?? null;
  const known = new Set(summary?.known_states ?? []);
  const rows = summary ? [
    ['Maximum exposure', summary.exposed_minor, 'exposed'],
    ['Merchant authorised', summary.approved_minor, 'approved'],
    ['Observed payout', summary.paid_minor, 'paid'],
    ['Estimated loss', summary.estimated_loss_minor, 'estimated_loss'],
    ['Confirmed loss', summary.confirmed_loss_minor, 'confirmed_loss'],
    ['Eligible recovery', summary.recoverable_minor, 'recoverable'],
    ['Received and matched', summary.recovered_minor, 'recovered'],
    ['Written off', summary.written_off_minor, 'written_off'],
  ] as const : [];
  return (
    <GroupedCard title="FINANCIAL HISTORY" note={summary?.updated_at ? `updated ${compactDate(summary.updated_at, true)}` : 'source stages unavailable'} flex>
      {summary ? rows.map(([label, amountValue, state]) => {
        const isKnown = known.has(state);
        return (
          <div key={state} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 0', borderTop: `1px solid ${line}` }}>
            <span style={{ flex: 1, font: `400 11.5px/1.4 ${sans}`, color: isKnown ? body : muted }}>{label}</span>
            <span style={{ font: `400 11.5px/1 ${mono}`, color: isKnown ? ink : muted }}>{isKnown ? money(amountValue, summary.currency) : 'unavailable'}</span>
          </div>
        );
      }) : <EmptySourceRow>No source-linked financial stages are available for this case.</EmptySourceRow>}
      <div style={{ flex: 1 }}/>
      <div style={{ paddingTop: 11, borderTop: `1px solid ${line}`, font: `400 11px/1.4 ${sans}`, color: muted }}>Authorisation is not payout; provider approval is not receipt; matching is not period reconciliation.</div>
    </GroupedCard>
  );
}

function DecisionBoundary({ wb, file, onOpen }: { wb: ClaimReviewWorkbench; file: CaseEvidenceFile; onOpen: (decision?: Decision) => void }) {
  const payoutCase = object(wb.decisionData?.payoutCase);
  const evaluation = object(wb.decisionData?.evaluation);
  const recommendation = text(payoutCase.nextAction);
  const reason = text(payoutCase.nextActionReason);
  const ruleName = text(evaluation.rule_name) ?? text(object(payoutCase.matchedRule).name);
  const context = wb.decisionData?.context as ClaimDecisionContext | undefined;
  const confidence = context?.identity?.confidenceScore;
  const firstGap = file.providerClaimReadiness.gates.find((gate) => !['met', 'not_applicable'].includes(gate.state));
  const firstGapEvidence = firstGap?.evidenceIds.flatMap((id) => file.evidence.filter((entry) => entry.id === id)) ?? [];
  const comparison = object(wb.decisionData?.resolutionComparison);
  const comparisonOptions = Array.isArray(comparison.options) ? comparison.options as Array<{ action?: string; confirmable?: boolean }> : [];
  return (
    <div style={{ flex: 'none', background: grouped, borderRadius: 13, padding: 11, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionHeading icon={<PlusIcon/>} title="DECISION BOUNDARY"/>
      <div style={{ background: '#ffffff', borderRadius: 10, boxShadow: panelShadow, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ font: `400 10px/1 ${mono}`, letterSpacing: '.06em', color: faint, marginBottom: 7 }}>UNAUTH RECOMMENDS · ADVISORY</div>
          <div style={{ font: `500 14px/1.35 ${sans}`, color: ink }}>{recommendationLabel(recommendation)}</div>
          <div style={{ font: `400 11.5px/1.5 ${sans}`, color: muted, marginTop: 5 }}>{ruleName ?? 'No matched rule'}{confidence == null ? '' : ` · confidence ${confidence.toFixed(2)}`} · {reason ?? 'recommendation reason unavailable'}</div>
        </div>
        {firstGap ? (
          <div style={{ borderRadius: 9, background: '#fff3e9', boxShadow: 'inset 0 0 0 1px rgba(201,138,26,.22)', padding: '10px 11px', display: 'flex', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: amber, marginTop: 4, flex: 'none' }}/>
            <span style={{ flex: 1, font: `400 11px/1.5 ${sans}`, color: amberText }}><strong style={{ display: 'block' }}>First hard gate: {firstGap.headline}</strong>{firstGap.reason}<br/>Next: {firstGap.nextAction}<br/>Source: {firstGapEvidence.length ? firstGapEvidence.map((entry) => sourceLabel(entry.system)).join(', ') : 'not retained'} · freshness {firstGapEvidence[0]?.freshness ?? 'unavailable'} · package effect: excluded until supported</span>
          </div>
        ) : null}
        {comparisonOptions.length ? <div style={{ padding: '9px 10px', borderRadius: 9, background: '#ffffff', boxShadow: 'inset 0 0 0 1px #eae8e5', color: body, font: `400 11px/1.5 ${sans}` }}><strong style={{ color: ink }}>Compare {comparisonOptions.length} resolutions</strong> · {comparisonOptions.filter((option) => option.confirmable).length} currently recordable. Known, estimated, zero and unavailable costs remain separate; replacement is recordable only when its exact item, quantity, source, currency, budget and concurrency gates are current.</div> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, font: `400 11.5px/1.45 ${sans}`, color: body }}><span style={{ color: green, flex: 'none' }}>✓</span>Records an immutable merchant decision under your role</div>
          <div style={{ display: 'flex', gap: 8, font: `400 11.5px/1.45 ${sans}`, color: body }}><span style={{ color: green, flex: 'none' }}>✓</span>Prepares an exact provider handoff for a human to send</div>
          <div style={{ display: 'flex', gap: 8, font: `400 11.5px/1.45 ${sans}`, color: body }}><span style={{ color: red, flex: 'none' }}>✕</span>Does not issue a refund or deny a request in the provider</div>
          <div style={{ display: 'flex', gap: 8, font: `400 11.5px/1.45 ${sans}`, color: body }}><span style={{ color: red, flex: 'none' }}>✕</span>Does not submit a recovery claim</div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button type="button" disabled={!wb.decisionData} onClick={() => onOpen()} style={{ ...buttonStyle(true, !wb.decisionData), flex: 1, padding: 9 }}>Record decision</button>
          <button type="button" disabled={!wb.decisionData} onClick={() => onOpen('escalated')} style={{ ...buttonStyle(false, !wb.decisionData), padding: '9px 12px' }}>Override</button>
        </div>
        <div style={{ font: `400 10.5px/1.5 ${mono}`, color: faint, textAlign: 'center' }}>Reversal appends a record · never erases</div>
      </div>
    </div>
  );
}

function MoneyRecoveryRail({ file, financial }: { file: CaseEvidenceFile; financial: CaseFinancialSummary | null }) {
  const recovery = file.recoveryCase;
  const currency = file.claim.currency ?? financial?.currency ?? recovery?.currency ?? null;
  const receivedKnown = Boolean(financial?.known_states.includes('recovered'));
  const stages = ['prepared', 'sent', 'approved', 'credited'] as const;
  const currentStage = recovery?.provider_claim_stage ?? 'prepared';
  const stageIndex = currentStage === 'reconciled' ? 4 : stages.indexOf(currentStage as typeof stages[number]);
  return (
    <div style={{ flex: 1, minHeight: 0, background: grouped, borderRadius: 13, padding: 11, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionHeading icon={<MoneyIcon/>} title="MONEY & RECOVERY"/>
      <div style={{ flex: 1, minHeight: 0, background: '#ffffff', borderRadius: 10, boxShadow: panelShadow, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 9, overflow: 'hidden' }}>
        <DetailRows rows={[
          { label: 'Gross exposure', value: money(file.claim.amountAtRiskMinor ?? financial?.exposed_minor, currency) },
          { label: 'Estimated loss', value: financial?.known_states.includes('estimated_loss') ? money(financial.estimated_loss_minor, currency) : 'unavailable', muted: !financial?.known_states.includes('estimated_loss') },
          { label: `Eligible recovery from ${recovery?.partner?.name ?? human(recovery?.owner_type, 'provider')}`, value: financial?.known_states.includes('recoverable') ? money(financial.recoverable_minor, currency) : 'unavailable', muted: !financial?.known_states.includes('recoverable') },
          { label: 'Received and matched', value: receivedKnown ? money(financial?.recovered_minor, currency) : 'unavailable', muted: !receivedKnown },
          { label: 'Reconciled', value: recovery?.provider_claim_stage === 'reconciled' ? 'recorded' : 'unavailable', muted: recovery?.provider_claim_stage !== 'reconciled' },
        ]}/>
        <div style={{ height: 1, background: line }}/>
        <div>
          <div style={{ font: `400 10px/1 ${mono}`, letterSpacing: '.06em', color: faint, marginBottom: 9 }}>RECOVERY ROUTE · {recoveryReference(recovery?.id)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[0, 1, 2, 3].map((index) => <div key={index} style={{ flex: 1, height: 5, borderRadius: 3, background: stageIndex >= index ? orange : '#f2ede6' }}/>) }
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
            {['READY', 'SENT', 'APPROVED', 'RECEIVED'].map((label, index) => <span key={label} style={{ font: `${stageIndex === index ? 500 : 400} 9.5px/1 ${mono}`, letterSpacing: '.05em', color: stageIndex === index ? ink : faint }}>{label}</span>)}
          </div>
          <div style={{ font: `400 11px/1.5 ${sans}`, color: muted, marginTop: 9 }}>{recovery ? file.providerClaimReadiness.nextAction : 'No recovery route is open. Eligibility remains unavailable until responsibility and provider terms are established.'}</div>
        </div>
        <div style={{ flex: 1 }}/>
        {recovery ? (
          <Link href={`/financials/recovery/${encodeURIComponent(recovery.id)}`} style={{ padding: 9, borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', font: `500 12.5px/1 ${sans}`, color: ink, textAlign: 'center', textDecoration: 'none' }}>Open recovery route</Link>
        ) : (
          <span aria-disabled="true" style={{ padding: 9, borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', font: `500 12.5px/1 ${sans}`, color: faint, textAlign: 'center' }}>Recovery route unavailable</span>
        )}
      </div>
    </div>
  );
}

type DialogMode = 'decision' | 'evidence' | 'responsibility' | 'snooze' | null;

function ActionDialog({
  mode,
  onClose,
  wb,
  file,
  canManage,
  onSaved,
}: {
  mode: DialogMode;
  onClose: () => void;
  wb: ClaimReviewWorkbench;
  file: CaseEvidenceFile;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [responsibilityReason, setResponsibilityReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!mode) return null;
  const title = mode === 'decision'
    ? `Record decision · ${caseReference(file.claim.id)}`
    : mode === 'evidence'
      ? `Request or add evidence · ${caseReference(file.claim.id)}`
      : mode === 'responsibility'
        ? `Assess responsibility · ${caseReference(file.claim.id)}`
        : `Snooze follow-up · ${caseReference(file.claim.id)}`;
  const description = mode === 'decision'
    ? 'This records the merchant’s decision. It prepares a handoff where supported, but does not move money or contact a provider.'
    : mode === 'evidence'
      ? 'Add a source record to this case. Source evidence and human findings remain visibly distinct.'
      : mode === 'responsibility'
        ? 'Confirm or correct the apparent responsibility. The recommendation remains advisory.'
        : 'Move the follow-up date without changing the evidence, recommendation, or decision.';

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'decision') {
        const result = await wb.onOutcome();
        if (!result.ok) throw new Error('The decision could not be recorded.');
      } else if (mode === 'evidence') {
        await wb.onEvidence();
      } else if (mode === 'snooze') {
        await wb.onSnooze();
      } else {
        const owner = file.apparentResponsibility.owner;
        const response = await fetch(`/api/claims/${encodeURIComponent(file.claim.id)}/responsibility`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `responsibility:${file.claim.id}:${Date.now()}`,
          },
          body: JSON.stringify({
            expected_version: Number((wb.decisionData?.payoutCase as { state_version?: number } | undefined)?.state_version ?? 1),
            loss_attribution: owner === 'courier' ? 'carrier_loss' : owner === 'three_pl' ? 'warehouse_missing_item' : owner === 'merchant' ? 'merchant_policy' : 'unknown',
            attribution_confidence: file.apparentResponsibility.confidence === 'known' ? 'high' : file.apparentResponsibility.confidence === 'likely' ? 'medium' : 'needs_more_evidence',
            recovery_owner: owner === 'courier' ? 'carrier' : owner === 'three_pl' ? 'three_pl' : owner === 'merchant' ? 'merchant' : 'unknown',
            recoverability: file.providerClaimReadiness.readiness === 'ready_to_submit' ? 'recoverable' : owner === 'none_established' ? 'not_recoverable' : 'needs_more_evidence',
            supporting_evidence_ids: file.apparentResponsibility.supportingEvidenceIds,
            conflicting_evidence_ids: file.apparentResponsibility.conflictingEvidenceIds,
            rationale: responsibilityReason.trim() || null,
          }),
        });
        const responseBody = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(responseBody.error ?? 'Responsibility confirmation failed.');
      }
      onClose();
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This action could not be recorded.');
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || !canManage || (mode === 'decision' && !wb.state.decision);
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      overlayId="case-action-dialog"
      pending={busy}
      pendingMessage="Recording this case action. Cancellation is disabled until the result is known."
      footer={<><span style={{ flex: 1, minWidth: 0, font: `400 10.5px/1.45 ${mono}`, color: faint }}>{!canManage ? 'your role cannot record this action' : 'this action is written to the append-only case history'}</span><button type="button" disabled={busy} onClick={onClose} style={{ ...buttonStyle(false), padding: '7px 12px' }}>Cancel</button><button type="button" disabled={disabled} onClick={() => void submit()} style={{ ...buttonStyle(true, disabled), padding: '7px 13px' }}>{busy ? 'Recording…' : mode === 'decision' ? 'Record decision' : mode === 'evidence' ? 'Add evidence' : mode === 'responsibility' ? 'Confirm responsibility' : 'Snooze follow-up'}</button></>}
      style={{ width: 560 }}
    >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {mode === 'decision' ? (
            <div style={{ background: grouped, borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <label style={{ font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>MERCHANT DECISION</label>
              <select aria-label="Merchant decision" value={wb.state.decision} onChange={(event) => wb.patch({ decision: event.target.value as Decision })} style={fieldStyle()}>
                <option value="">Choose a decision</option>
                {DECISIONS.map((decision) => <option key={decision} value={decision}>{DECISION_LABELS[decision]}</option>)}
              </select>
              <label style={{ font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>AUTHORISED VALUE</label>
              <input aria-label="Decision amount" inputMode="decimal" value={wb.state.decisionAmount} onChange={(event) => wb.patch({ decisionAmount: event.target.value })} placeholder={file.claim.currency ? `0.00 ${file.claim.currency}` : 'Currency unavailable'} style={fieldStyle()}/>
              <label style={{ font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>RATIONALE</label>
              <textarea aria-label="Decision rationale" value={wb.state.notes} onChange={(event) => wb.patch({ notes: event.target.value })} rows={4} placeholder="Why this is the merchant decision" style={{ ...fieldStyle(), resize: 'vertical' }}/>
            </div>
          ) : mode === 'evidence' ? (
            <div style={{ background: grouped, borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <label style={{ font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>EVIDENCE TYPE</label>
              <select aria-label="Evidence type" value={wb.state.evidenceType} onChange={(event) => wb.patch({ evidenceType: event.target.value as EvidenceType })} style={fieldStyle()}>{EVIDENCE_TYPES.map((entry) => <option key={entry} value={entry}>{EVIDENCE_TYPE_LABELS[entry]}</option>)}</select>
              <label style={{ font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>SOURCE</label>
              <select aria-label="Evidence source" value={wb.state.source} onChange={(event) => wb.patch({ source: event.target.value as EvidenceSource })} style={fieldStyle()}>{EVIDENCE_SOURCES.map((entry) => <option key={entry} value={entry}>{EVIDENCE_SOURCE_LABELS[entry]}</option>)}</select>
              <label style={{ font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>SOURCE URL · OPTIONAL</label>
              <input aria-label="Evidence URL" value={wb.state.evidenceUrl} onChange={(event) => wb.patch({ evidenceUrl: event.target.value })} placeholder="https://" style={fieldStyle()}/>
            </div>
          ) : mode === 'responsibility' ? (
            <div style={{ background: grouped, borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ font: `500 13px/1.4 ${sans}`, color: ink }}>{file.apparentResponsibility.headline}</div>
              <div style={{ font: `400 11.5px/1.5 ${sans}`, color: muted }}>{file.apparentResponsibility.explanation}</div>
              <label style={{ font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>RATIONALE</label>
              <textarea aria-label="Responsibility rationale" value={responsibilityReason} onChange={(event) => setResponsibilityReason(event.target.value)} rows={4} placeholder="Add a rationale when evidence is contested" style={{ ...fieldStyle(), resize: 'vertical' }}/>
            </div>
          ) : (
            <div style={{ background: grouped, borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <label style={{ font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>DAYS</label>
              <input aria-label="Snooze days" type="number" min={1} max={30} value={wb.state.snoozeDays} onChange={(event) => wb.patch({ snoozeDays: event.target.value })} style={fieldStyle()}/>
              <label style={{ font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>REASON</label>
              <input aria-label="Snooze reason" value={wb.state.snoozeReason} onChange={(event) => wb.patch({ snoozeReason: event.target.value })} style={fieldStyle()}/>
            </div>
          )}
          {error ? <div role="alert" style={{ font: `400 11.5px/1.5 ${sans}`, color: red }}>{error}</div> : null}
        </div>
    </Modal>
  );
}

function InlineToast({ wb }: { wb: ClaimReviewWorkbench }) {
  if (!wb.state.message) return null;
  const success = wb.state.messageTone === 'success';
  const error = wb.state.messageTone === 'error';
  return (
    <div role="status" style={{ position: 'fixed', zIndex: 70, top: 16, right: 16, minHeight: 40, padding: '0 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 12px 30px rgba(28,27,25,.12)', background: success ? '#eef6f1' : error ? '#fdf0e6' : '#ffffff', color: success ? '#1a6b43' : error ? red : body, font: `500 12px/1.4 ${sans}` }}>
      <span>{wb.state.message}</span>
      <button type="button" aria-label="Dismiss" onClick={() => wb.patch({ message: '' })} style={{ border: 0, padding: 3, background: 'transparent', color: 'inherit', cursor: 'pointer' }}>×</button>
    </div>
  );
}

export function CaseDetailOperations({
  wb,
  financialSummaries,
  canManage,
  caseBackHref: _caseBackHref = '/cases',
  initialTab,
  investigationId,
  initialAction,
  caseEvidenceFile,
}: {
  wb: ClaimReviewWorkbench;
  financialSummaries: CaseFinancialSummary[];
  canManage: boolean;
  caseBackHref?: string;
  initialTab?: CaseDetailTab | null;
  investigationId?: string | null;
  initialAction?: CaseDetailAction;
  caseEvidenceFile?: CaseEvidenceFile | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<CaseDetailTab>(initialTab ?? 'evidence');
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const initialActionHandled = useRef(false);
  const file = caseEvidenceFile ?? null;
  const claim = wb.selectedClaim;
  const caseRef = caseReference(file?.claim.id ?? claim?.id ?? '');
  useBreadcrumbLabel(caseRef);
  const topbarProvider = file?.recoveryCase?.partner?.name
    ?? file?.evidence?.find((entry) => entry.system && !/manual|unauth/i.test(entry.system))?.system
    ?? null;
  useBreadcrumbDetail(file?.claim.updatedAt
    ? `last updated ${compactDate(file.claim.updatedAt, true)} · ${sourceLabel(topbarProvider)}`
    : 'case source and freshness unavailable');

  useEffect(() => {
    function sync() {
      const url = new URL(window.location.href);
      const focused = normaliseInvestigationId(url.searchParams.get('investigationId') ?? investigationId);
      setTab(focused ? 'recommendation' : tabFromUrl(url.searchParams.get('tab')));
    }
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [investigationId]);

  useEffect(() => {
    if (!initialAction || initialActionHandled.current) return;
    initialActionHandled.current = true;
    if (initialAction === 'request-evidence') setDialog('evidence');
    else if (initialAction === 'snooze') setDialog('snooze');
    else setDialog('decision');
  }, [initialAction]);

  function selectTab(next: CaseDetailTab) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    url.searchParams.delete('investigationId');
    if (url.hash.startsWith('#investigation-')) url.hash = '';
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setTab(next);
  }

  function openDecision(decision?: Decision) {
    if (decision) wb.patch({ decision, resolution: decision === 'escalated' ? 'escalate' : '' });
    const exposure = file?.claim.amountAtRiskMinor;
    const currency = file?.claim.currency ?? claim?.currency ?? null;
    if (!wb.state.decisionAmount && exposure != null && currency) {
      wb.patch({ decisionAmount: formatMajorUnitInput(exposure, currency) });
    }
    setDialog('decision');
  }

  if (!claim || !file) {
    return (
      <div data-screen-label="Case review" style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', color: muted, font: `400 12px/1.5 ${sans}` }} role="status">
        {claim ? 'The case evidence file is unavailable. No evidence, responsibility, recovery, or money state is being inferred.' : 'Loading case context…'}
      </div>
    );
  }

  const financial = financialSummaries.find((row) => row.currency === file.claim.currency) ?? financialSummaries[0] ?? null;
  const customerName = file.claim.customerName ?? wb.customerName ?? claim.customer_name ?? 'Customer';
  const issue = file.claim.issueSummary || CLAIM_TYPE_LABELS[claim.claim_type ?? ''] || 'this case needs review';
  const title = issue.toLowerCase().startsWith(customerName.toLowerCase()) ? issue : `${customerName} says ${issue.charAt(0).toLowerCase()}${issue.slice(1)}`;
  const openedAt = file.claim.createdAt ?? claim.submitted_at ?? claim.created_at ?? null;
  const orderRef = file.claim.orderReference ?? claim.order_ref ?? claim.shopify_order_id ?? null;
  const currency = file.claim.currency ?? claim.currency ?? financial?.currency ?? null;
  const atRisk = file.claim.amountAtRiskMinor ?? financial?.exposed_minor ?? null;
  const owner = claim.assigned_to_name ?? (claim.assigned_to ? 'Assigned teammate' : 'Unassigned');
  const primaryChip = STATUS_LABELS[claim.status]?.toUpperCase() ?? human(claim.status).toUpperCase();
  const typeChip = (CLAIM_TYPE_LABELS[claim.claim_type ?? ''] ?? human(file.claim.claimType, 'Case')).toUpperCase();
  const requestedChip = human(file.claim.requestedAction ?? claim.requested_action, 'Action not recorded').toUpperCase();

  return (
    <>
      <InlineToast wb={wb}/>
      <div data-surface-id="case-review-workbench" data-state-id="case-evidence-truth" style={{ flex: 'none', padding: '15px 22px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ padding: '2px 7px', borderRadius: 5, background: '#fdf0e6', font: `500 10px/1.5 ${sans}`, letterSpacing: '.05em', color: red }}>{primaryChip}</span>
            <span style={{ padding: '2px 7px', borderRadius: 5, background: grouped, font: `500 10px/1.5 ${sans}`, letterSpacing: '.05em', color: body }}>{typeChip}</span>
            <span style={{ padding: '2px 7px', borderRadius: 5, background: grouped, font: `500 10px/1.5 ${sans}`, letterSpacing: '.05em', color: body }}>{requestedChip}</span>
          </div>
          <div style={{ font: `500 20px/1.25 ${sans}`, letterSpacing: '-.01em', color: ink }}>{title}</div>
          <div style={{ font: `400 12px/1.5 ${sans}`, color: muted, marginTop: 5 }}>{openedAt ? `Opened ${compactDate(openedAt)}` : 'Opened date unavailable'}{orderRef ? ` · order ${orderRef.startsWith('#') ? orderRef : `#${orderRef}`} · ${sourceLabel(file.claim.orderStore ?? file.claim.orderSource)} · ${file.claim.orderPlacedAt ? compactDate(file.claim.orderPlacedAt) : 'order date unavailable'} · ${money(file.claim.orderAmountMinor, file.claim.orderCurrency)} · record ${file.claim.orderId?.slice(0, 8) ?? 'unavailable'}` : ' · order unavailable'} · {money(atRisk, currency)} at risk · owner {owner}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, paddingTop: 6 }}>
          <button type="button" disabled={!canManage} onClick={() => setDialog('evidence')} style={buttonStyle(false, !canManage)}>Request evidence</button>
          <button type="button" disabled={!canManage} onClick={() => setDialog('responsibility')} style={buttonStyle(false, !canManage)}>Assess responsibility</button>
          <button type="button" aria-label="Review merchant decision" disabled={!canManage || !wb.decisionData} onClick={() => setManageOpen(true)} style={buttonStyle(true, !canManage || !wb.decisionData)}>Record decision</button>
        </div>
      </div>

      <nav aria-label="Case file tabs" style={{ flex: 'none', padding: '14px 22px 0', display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {TABS.map((item) => (
          <button
            type="button"
            key={item.key}
            aria-current={tab === item.key ? 'page' : undefined}
            aria-label={item.key === 'recommendation' && investigationId ? 'Responsibility · Focused' : undefined}
            onClick={() => selectTab(item.key)}
            style={{ padding: '7px 11px', border: 0, borderRadius: tab === item.key ? '8px 8px 0 0' : 0, background: tab === item.key ? grouped : 'transparent', font: `${tab === item.key ? 500 : 400} 12px/1 ${sans}`, color: tab === item.key ? ink : muted, cursor: 'pointer' }}
          >{item.label}</button>
        ))}
      </nav>

      <div style={{ flex: 1, minHeight: 0, padding: '0 22px 20px', display: 'flex', gap: 14 }}>
        <div role="region" aria-label="Case file content" tabIndex={0} style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', display: 'grid', gridAutoRows: 'max-content', alignContent: 'start', gap: 12 }}>
          {tab === 'evidence' ? (
            <>
              <TruthStrip file={file} financial={financial}/>
              <ProviderGates file={file}/>
              {file.evidence.some((entry) => entry.evidenceType === 'delivery_photo') ? (
                <DeliveryPhotoFinding caseId={file.claim.id} finding={null} rationale={null} recordedAt={null} canManage={canManage} onSaved={() => router.refresh()}/>
              ) : null}
              <EvidenceTimeline file={file}/>
            </>
          ) : tab === 'recommendation' ? (
            <>
              <RecommendationContent wb={wb} file={file}/>
              <CaseInvestigationsCard caseId={file.claim.id} canManage={canManage} onRecommendationRefresh={() => router.refresh()} focusedInvestigationId={normaliseInvestigationId(investigationId)}/>
            </>
          ) : tab === 'decisions' ? (
            <DecisionsContent wb={wb} file={file}/>
          ) : tab === 'recovery' ? (
            <RecoveryContent file={file}/>
          ) : tab === 'financial' ? (
            <FinancialContent summaries={financialSummaries} currency={currency}/>
          ) : (
            <>
              <EvidenceTimeline file={file} expanded/>
              {file.availability.errors.length ? (
                <div role="status" style={{ flex: 'none', borderRadius: 10, background: '#fff3e9', padding: '10px 12px', font: `400 11px/1.5 ${sans}`, color: amberText }}>Some sources are unavailable: {file.availability.errors.join(' · ')}</div>
              ) : null}
            </>
          )}
        </div>
        <div role="region" aria-label="Decision context" tabIndex={0} style={{ width: 376, flex: 'none', minHeight: 0, overflowY: 'auto', display: 'grid', gridAutoRows: 'max-content', alignContent: 'start', gap: 12 }}>
          <DecisionBoundary wb={wb} file={file} onOpen={openDecision}/>
          <MoneyRecoveryRail file={file} financial={financial}/>
        </div>
      </div>
      <ActionDialog mode={dialog} onClose={() => setDialog(null)} wb={wb} file={file} canManage={canManage} onSaved={() => router.refresh()}/>
      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title="Review merchant decision" description="Review evidence, recommendation, and the merchant-owned decision before recording it." overlayId="case-decision-panel" size="md">
        <ClaimReviewManageCard wb={wb} canManage={canManage} onDecisionRecorded={() => router.refresh()}/>
      </Modal>
    </>
  );
}
