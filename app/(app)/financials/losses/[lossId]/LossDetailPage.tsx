import { isActiveWorkTask } from '@/lib/work/types';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { getLossReadModel } from '@/lib/losses/readModel';
import { LossActions } from '@/components/losses/LossActions';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { formatDateAbsolute, formatDateTime, formatMoneyOrDash, formatMonthYearInTimeZone } from '@/lib/utils/format';
import { humanise, label as enumLabel } from '@/lib/ui/labels';
import { hashId } from '@/lib/ui/displayRef';
import { providerLabel } from '@/lib/ui/merchantCopy';

export const dynamic = 'force-dynamic';

type LossAmount = {
  currency: string | null;
  realisedLossMinor: number | null;
  estimatedLossMinor: number | null;
  recoverableMinor: number | null;
  recoveredMinor: number | null;
  writtenOffMinor: number | null;
  outstandingRecoveryMinor: number | null;
};

type RecoveryRow = {
  id: string;
  status: string;
  currency: string;
  merchant_loss_amount: number;
  eligible_loss_amount: number | null;
  estimated_recoverable_max: number | null;
  amount_recovered: number | null;
  deadline_at: string | null;
  updated_at: string;
};

type AttributionRow = {
  id: string;
  attribution: string;
  confidence: number | null;
  accountable_party_type: string | null;
  accountable_party_name: string | null;
  is_primary: boolean;
};

type EvidenceRow = {
  id: string;
  evidence_type: string;
  source_provider: string;
  source_verified: boolean;
};

type FinancialEntry = {
  id: string;
  state: string;
  amount_minor: number | null;
  currency: string;
  effective_at: string;
  created_at: string;
  source_record_id: string | null;
  reverses_entry_id: string | null;
  metadata: Record<string, unknown> | null;
};

type WorkTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  owner_user_id: string | null;
  due_at: string | null;
  blocking_reason: string | null;
};

const card = {
  borderRadius: 10,
  background: '#fff',
  boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)',
} as const;

const sectionLabel = {
  font: "600 10.5px/1 'Inter',sans-serif",
  letterSpacing: '.09em',
  color: '#64686d',
} as const;

const mono = "400 11.5px/1.5 'IBM Plex Mono',monospace";

function money(minor: number | null | undefined, currency: string | null | undefined) {
  return minor == null || !currency ? '—' : formatMoneyOrDash(minor, currency);
}

function humaniseField(value: unknown) {
  return typeof value === 'string' && value ? humanise(value) : 'Unavailable';
}

function labelledField(value: unknown, family: 'attribution' | 'ownerType') {
  return typeof value === 'string' && value ? enumLabel(family, value) : 'Unavailable';
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const days = Math.ceil((Date.parse(value) - Date.now()) / 86_400_000);
  return Number.isFinite(days) ? days : null;
}

function periodLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : formatMonthYearInTimeZone(date, 'Europe/London');
}

function metadataText(metadata: Record<string, unknown> | null, keys: string[]) {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function LinkedRecord({ type, href, label, badge }: { type: string; href: string; label: string; badge?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "400 10px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{type}</div>
        <div style={{ marginTop: 2, font: "500 11.5px/1.4 'Inter',sans-serif" }}><Link href={href} style={{ color: '#1c1f23', textDecoration: 'none' }}>{label}</Link></div>
      </div>
      {badge ? <span style={{ padding: '2px 7px', borderRadius: 5, background: '#fff3e9', font: "500 10px/1.5 'Inter',sans-serif", color: '#7a5310' }}>{badge}</span> : null}
    </div>
  );
}

export default async function LossDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const client = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/overview');

  const [model, canManage] = await Promise.all([
    getLossReadModel(client, ctx.merchantId, id),
    hasPermission(client, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS),
  ]);
  if (!model) notFound();

  const amounts = model.amounts as LossAmount[];
  const mixedCurrency = amounts.length > 1;
  const amount = amounts.length === 1 ? amounts[0] : null;
  const currency = amount?.currency ?? model.loss.currency ?? null;
  const recoveries = model.recoveries as RecoveryRow[];
  const recoveredMinor = amount?.recoveredMinor ?? null;
  const identifiedMinor = amount?.realisedLossMinor ?? amount?.estimatedLossMinor ?? null;
  const orderExposureMinor = model.loss.order_value_minor ?? null;
  const finalNetLossMinor = identifiedMinor != null && recoveredMinor != null
    ? Math.max(0, identifiedMinor - recoveredMinor)
    : null;
  const effectiveAt = model.loss.confirmed_at ?? model.loss.estimated_at ?? model.loss.created_at;
  const reference = `LOSS-${hashId(id).slice(1)}`;
  const caseReference = model.loss.support_payout_case_id ? `CASE-${hashId(model.loss.support_payout_case_id).slice(1)}` : null;
  const orderReference = model.loss.order_id ? hashId(model.loss.order_id) : null;
  const customerReference = model.loss.customer_identity_id ? `Customer ${hashId(model.loss.customer_identity_id)}` : null;
  const title = enumLabel('lossCategory', model.loss.case_category);
  const statusParts = [amount?.realisedLossMinor == null ? 'ESTIMATED' : 'CONFIRMED'];
  if (model.loss.written_off_at || model.loss.status === 'closed_unrecoverable') statusParts.push('WRITTEN OFF');
  else if ((amount?.outstandingRecoveryMinor ?? 0) > 0) statusParts.push('UNRECOVERED');
  else if ((recoveredMinor ?? 0) > 0) statusParts.push('RECOVERED');
  const writeOffState = model.loss.written_off_at || model.loss.status === 'closed_unrecoverable'
    ? 'already_written_off'
    : mixedCurrency
      ? 'mixed_currency'
      : amount?.outstandingRecoveryMinor == null
        ? 'unavailable'
        : amount.outstandingRecoveryMinor <= 0
          ? 'no_outstanding'
          : 'available';
  const primaryRecovery = recoveries[0] ?? null;
  const recoveryDays = daysUntil(primaryRecovery?.deadline_at);
  const recoverySummary = primaryRecovery
    ? `REC-${hashId(primaryRecovery.id).slice(1)} · ${model.loss.counterparty_name ?? enumLabel('counterparty', model.loss.counterparty_type)}${recoveryDays == null ? '' : recoveryDays < 0 ? ' · window closed' : ` · ${recoveryDays} days left`}`
    : null;

  const moneyChain = [
    { label: 'ORDER EXPOSURE', value: money(orderExposureMinor, currency), detail: orderExposureMinor == null ? 'order value unavailable' : 'separate from recorded loss', color: '#1c1f23' },
    { label: 'REFUNDS AND OFFSETS', value: model.loss.refund_value_minor == null ? '—' : `−${money(model.loss.refund_value_minor, currency)}`, detail: model.loss.refund_value_minor == null ? 'refund basis unavailable' : model.loss.refund_value_minor === 0 ? 'nothing refunded yet' : 'recorded refund value', color: '#64686d' },
    { label: amount?.realisedLossMinor == null ? 'ESTIMATED LOSS' : 'CONFIRMED LOSS', value: money(identifiedMinor, currency), detail: amount?.realisedLossMinor == null ? 'not confirmed' : 'append-only ledger fact', color: '#7a5310' },
    { label: 'ELIGIBLE RECOVERY', value: money(amount?.recoverableMinor, currency), detail: amount?.recoverableMinor == null ? 'eligibility unavailable' : primaryRecovery ? `${model.loss.counterparty_name ?? enumLabel('counterparty', model.loss.counterparty_type)} ceiling` : 'recorded ceiling', color: '#1a6b43' },
    { label: 'RECEIVED AND MATCHED', value: money(recoveredMinor, currency), detail: recoveredMinor == null ? 'receipt-backed match unavailable' : recoveredMinor === 0 ? 'verified zero received' : 'source-backed credit matched', color: '#64686d' },
    { label: 'FINAL NET LOSS', value: money(finalNetLossMinor, currency), detail: identifiedMinor != null && recoveredMinor != null ? `${money(identifiedMinor, currency)} − ${money(recoveredMinor, currency)}` : 'cannot be computed from unavailable stages', color: '#b0431a' },
  ];

  const attributionRows = (model.attributionCandidates as AttributionRow[]).slice(0, 3);
  const evidenceRows = (model.evidence as EvidenceRow[]).slice(0, 4);
  const financialEntries = (model.financialEntries as FinancialEntry[]).slice(0, 7);
  const tasks = (model.tasks as WorkTask[]).filter((task) => isActiveWorkTask(task.status)).slice(0, 2);
  const sourceNames = [...new Set([
    ...evidenceRows.map((row) => providerLabel(row.source_provider)),
    model.loss.counterparty_name,
  ].filter((value): value is string => Boolean(value)))];

  return (
    <>
      <SetBreadcrumbLabel label={reference} detail="append only · corrections are new entries" />
      <div data-surface-id="loss-detail" data-archetype="P7" data-state-id="loss-detail-supplied" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
        <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
          <span style={{ padding: '2px 7px', borderRadius: 5, background: '#fff3e9', font: "500 10px/1.5 'Inter',sans-serif", color: '#7a5310' }}>{statusParts.join(' · ')}</span>
          <span style={{ font: "500 14.5px/1.2 'Inter',sans-serif", color: '#1c1f23' }}>{title}</span>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 12px/1.4 'Inter',sans-serif", color: '#64686d' }}>
            {orderReference ? `order ${orderReference}` : 'order unavailable'} · {customerReference ?? 'customer unavailable'} · effective {formatDateAbsolute(effectiveAt)}
          </span>
          <div style={{ flex: 1 }}/>
          <button type="button" disabled title="No standalone financial-correction workflow is available for this loss" style={{ padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12.5px/1 'Inter',sans-serif", color: '#64686d', cursor: 'not-allowed' }}>Add a correction</button>
          <LossActions
            lossId={id}
            reference={reference}
            canManage={canManage}
            writeOffAmountMinor={amount?.outstandingRecoveryMinor ?? null}
            grossExposureMinor={identifiedMinor}
            recoveredMinor={recoveredMinor}
            currency={currency}
            recoverySummary={recoverySummary}
            writeOffState={writeOffState}
            compact
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <section style={{ ...card, padding: '14px 16px 13px', flex: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                <div style={sectionLabel}>THE MONEY CHAIN</div>
                <div style={{ flex: 1 }}/>
                <span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>each step is a recorded fact · nothing carries forward on its own</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', borderTop: '1px solid #e4e3e0' }}>
                {moneyChain.map((item, index) => (
                  <div key={item.label} style={{ padding: '13px 14px 12px', borderLeft: index ? '1px solid #eae8e5' : undefined }}>
                    <div style={{ minHeight: 24, font: "400 9.5px/1.3 'Inter',sans-serif", letterSpacing: '.05em', color: '#64686d' }}>{item.label}</div>
                    <div style={{ marginTop: 8, font: "400 16px/1 'IBM Plex Mono',monospace", color: item.value === '—' ? '#a7abad' : item.color }}>{item.value}</div>
                    <div style={{ marginTop: 7, font: "400 10.5px/1.45 'Inter',sans-serif", color: '#64686d' }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </section>

            <div style={{ display: 'flex', gap: 12, flex: 'none' }}>
              <section style={{ ...card, padding: '13px 15px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 11 }}><div style={sectionLabel}>ATTRIBUTION</div><div style={{ flex: 1 }}/><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>responsibility, not blame</span></div>
                {attributionRows.length ? attributionRows.map((candidate, index) => {
                  const confidence = typeof candidate.confidence === 'number' ? Math.max(0, Math.min(1, Number(candidate.confidence))) : null;
                  const candidateLabel = candidate.accountable_party_name
                    ? `${labelledField(candidate.accountable_party_type, 'ownerType')} — ${candidate.accountable_party_name}`
                    : candidate.accountable_party_type
                      ? labelledField(candidate.accountable_party_type, 'ownerType')
                      : labelledField(candidate.attribution, 'attribution');
                  return (
                    <div key={candidate.id} style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: index < attributionRows.length - 1 ? 10 : 0 }}>
                      <span style={{ minWidth: 112, font: `${candidate.is_primary ? '500 13px' : '400 12.5px'}/1.3 'Inter',sans-serif`, color: candidate.is_primary ? '#1c1f23' : '#64686d' }}>{candidateLabel}</span>
                      <div style={{ flex: 1, height: 5, overflow: 'hidden', borderRadius: 3, background: '#f2f0ed' }}><div style={{ width: `${Math.round((confidence ?? 0) * 100)}%`, height: '100%', background: candidate.is_primary ? '#1c1f23' : '#a7abad' }}/></div>
                      <span style={{ width: 34, textAlign: 'right', font: "400 11.5px/1 'IBM Plex Mono',monospace", color: confidence == null ? '#a7abad' : candidate.is_primary ? '#1c1f23' : '#64686d' }}>{confidence == null ? '—' : confidence.toFixed(2)}</span>
                    </div>
                  );
                }) : <div style={{ padding: '10px 0', font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>No source-backed attribution candidate is recorded.</div>}
                <div style={{ marginTop: 11, paddingTop: 9, borderTop: '1px solid #f4f2ef', font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>
                  {model.loss.attribution
                    ? `${labelledField(model.loss.attribution, 'attribution')} is the recorded attribution${model.loss.attribution_confidence == null ? '; confidence is unavailable.' : ` at ${Number(model.loss.attribution_confidence).toFixed(2)} confidence.`}`
                    : 'Attribution remains unconfirmed. Candidate scores are evidence, not a merchant decision.'}
                </div>
              </section>

              <section style={{ ...card, padding: '13px 15px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 11 }}><div style={sectionLabel}>EVIDENCE THIS LOSS NEEDS</div><div style={{ flex: 1 }}/><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: model.loss.missing_evidence_count > 0 ? '#7a5310' : '#1a6b43' }}>{evidenceRows.length} held · {model.loss.missing_evidence_count} missing</span></div>
                {evidenceRows.map((item, index) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: index ? '1px solid #f4f2ef' : undefined }}>
                    <span style={{ width: 7, height: 7, flex: 'none', borderRadius: '50%', background: item.source_verified ? '#1a7f4b' : '#c98a1a' }}/>
                    <span style={{ flex: 1, font: "400 12px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{humaniseField(item.evidence_type)}</span>
                    <span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{item.source_verified ? 'held' : 'unverified'}</span>
                  </div>
                ))}
                {model.loss.missing_evidence_count > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: evidenceRows.length ? '1px solid #f4f2ef' : undefined }}>
                    <span style={{ width: 7, height: 7, flex: 'none', borderRadius: '50%', background: '#b0431a' }}/>
                    <span style={{ flex: 1, font: "400 12px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{model.loss.missing_evidence_count} required evidence {model.loss.missing_evidence_count === 1 ? 'item is' : 'items are'} not held</span>
                    <span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>missing</span>
                  </div>
                ) : null}
                {!evidenceRows.length && model.loss.missing_evidence_count === 0 ? <div style={{ padding: '10px 0', font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>Evidence requirements are unavailable.</div> : null}
              </section>
            </div>

            <section style={{ ...card, padding: '12px 16px 10px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 6 }}>
                <div style={sectionLabel}>LEDGER ENTRIES</div><div style={{ flex: 1 }}/><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{financialEntries.length} {financialEntries.length === 1 ? 'entry' : 'entries'} · none has been edited or removed</span>
              </div>
              <div style={{ minHeight: 0, overflow: 'hidden' }}>
                {financialEntries.length ? financialEntries.map((entry) => {
                  const note = metadataText(entry.metadata, ['reason', 'rationale', 'description', 'note'])
                    ?? (entry.reverses_entry_id ? 'Correction entry; the earlier entry remains visible' : 'Recorded against this loss');
                  const actor = metadataText(entry.metadata, ['actor_name', 'actor', 'source']) ?? 'recorded entry';
                  return (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}>
                      <span style={{ width: 92, flex: 'none', font: "400 11px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{formatDateTime(entry.effective_at ?? entry.created_at)}</span>
                      <span style={{ width: 172, flex: 'none', font: "500 12px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{humaniseField(entry.state)}</span>
                      <span style={{ width: 80, flex: 'none', textAlign: 'right', font: "400 12px/1.4 'IBM Plex Mono',monospace", color: entry.amount_minor == null ? '#a7abad' : '#1c1f23' }}>{money(entry.amount_minor, entry.currency)}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 6, font: "400 11.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>{note}</span>
                      <span style={{ width: 120, flex: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{actor}</span>
                    </div>
                  );
                }) : <div style={{ padding: '16px 0', borderTop: '1px solid #f4f2ef', font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>No canonical financial entry is recorded for this loss.</div>}
              </div>
              <div style={{ flex: 1 }}/>
              <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid #e4e3e0', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>A write-off adds a new entry; it does not change the original {money(identifiedMinor, currency)} recorded loss.</div>
            </section>
          </div>

          <aside style={{ width: 300, flex: 'none', padding: '12px 13px', borderRadius: 13, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={sectionLabel}>LINKED RECORDS</div>
            <div style={{ ...card, padding: '3px 13px 9px', display: 'flex', flexDirection: 'column' }}>
              {model.loss.support_payout_case_id && caseReference ? <LinkedRecord type="CASE" href={`/cases/${model.loss.support_payout_case_id}`} label={caseReference}/>: null}
              {model.loss.order_id && orderReference ? <LinkedRecord type="ORDER" href={`/orders/${model.loss.order_id}`} label={orderReference}/>: null}
              {model.loss.shipment_id ? <LinkedRecord type="SHIPMENT" href={`/shipments/${model.loss.shipment_id}`} label={`SHP-${hashId(model.loss.shipment_id).slice(1)}`}/>: null}
              {recoveries.map((recovery) => <LinkedRecord key={recovery.id} type="RECOVERY" href={`/financials/recovery/${recovery.id}`} label={`REC-${hashId(recovery.id).slice(1)} · ${model.loss.counterparty_name ?? enumLabel('counterparty', model.loss.counterparty_type)}`} badge={enumLabel('recoveryStatus', recovery.status).toUpperCase()}/>) }
              {model.loss.customer_identity_id && customerReference ? <LinkedRecord type="CUSTOMER" href={`/customers/${model.loss.customer_identity_id}`} label={customerReference}/>: null}
              {!model.loss.support_payout_case_id && !model.loss.order_id && !model.loss.shipment_id && !recoveries.length && !model.loss.customer_identity_id ? <div style={{ padding: '10px 0', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>No linked records are available.</div> : null}
            </div>

            <div style={sectionLabel}>OPEN WORK ON THIS LOSS</div>
            <div style={{ ...card, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {tasks.length ? tasks.map((task, index) => {
                const dueDays = daysUntil(task.due_at);
                const due = task.due_at == null ? 'no due date' : dueDays == null ? formatDateAbsolute(task.due_at) : dueDays < 0 ? `${Math.abs(dueDays)}d overdue` : dueDays === 0 ? 'today' : `${dueDays} days`;
                return (
                  <div key={task.id} style={{ paddingTop: index ? 9 : 0, borderTop: index ? '1px solid #f4f2ef' : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, font: "500 11.5px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{task.title}</span><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: dueDays != null && dueDays <= 2 ? '#b0431a' : '#64686d' }}>{due}</span></div>
                    <div style={{ marginTop: 3, font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>{task.owner_user_id ? 'Assigned operator' : 'Unassigned'} · {task.blocking_reason ?? enumLabel('workflowStatus', task.status)}</div>
                  </div>
                );
              }) : <div style={{ font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>No open work is recorded on this loss.</div>}
            </div>

            <div style={sectionLabel}>SCOPE</div>
            <div style={{ ...card, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Currency', currency ?? 'Unavailable', '#1c1f23'],
                ['Effective date', formatDateAbsolute(effectiveAt), '#1c1f23'],
                ['Period', periodLabel(effectiveAt), '#7a5310'],
                ['Source', sourceNames.length ? sourceNames.join(' + ') : 'Unavailable', '#1c1f23'],
                ['Cost basis', 'Unavailable', '#64686d'],
              ].map(([label, value, color]) => <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>{label}</span><span style={{ maxWidth: '62%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', font: mono, color }}>{value}</span></div>)}
            </div>
            <div style={{ flex: 1 }}/>
            <div style={{ paddingTop: 10, borderTop: '1px solid #e4e3e0', font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>A recovery received after this loss’s effective period remains a later ledger event. Earlier periods are not silently rewritten.</div>
          </aside>
        </div>
      </div>
    </>
  );
}
