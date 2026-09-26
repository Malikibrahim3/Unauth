import { isActiveWorkTask } from '@/lib/work/types';
import Link from 'next/link';
import type { RecoveryCase, RecoveryCaseEvent } from '@/lib/recoveries/types';
import { RECOVERY_OWNER_LABELS, RECOVERY_STATUS_LABELS } from '@/lib/recoveries/types';
import { RECOVERY_TYPE_LABELS } from '@/lib/partners/types';
import { formatDateAbsolute, formatDateTime, formatMoney } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import { humanizeEvidenceKey } from '@/components/claims/payout/payoutCopy';
import { label } from '@/lib/ui/labels';
import { providerLabel } from '@/lib/ui/merchantCopy';

export type RecoveryCorrespondenceRow = {
  id: string;
  direction: string;
  source_provider: string;
  source_record_id: string;
  subject: string | null;
  source_url: string | null;
  sent_at?: string | null;
  received_at?: string | null;
};

export type RecoveryTaskRow = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  blocking_reason: string | null;
};

export type ProviderCreditEventRow = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  amount_minor: number;
  currency: string;
  reason: string | null;
  source_record_id: string | null;
  evidence_item_id: string | null;
  financial_entry_id: string | null;
  created_at: string;
};

type Props = {
  recovery: RecoveryCase;
  events: RecoveryCaseEvent[];
  correspondence: RecoveryCorrespondenceRow[];
  tasks: RecoveryTaskRow[];
  providerCreditEvents: ProviderCreditEventRow[];
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

function recoveryRef(id: string) {
  return `REC-${hashId(id).slice(1)}`;
}

function caseRef(id: string) {
  return `CASE-${hashId(id).slice(1)}`;
}

function lossRef(id: string) {
  return `LOSS-${hashId(id).slice(1)}`;
}

function eventLabel(event: RecoveryCaseEvent) {
  if (event.event_type === 'status_changed' && event.to_status) return `Recovery status changed to ${RECOVERY_STATUS_LABELS[event.to_status]}`;
  const names: Partial<Record<RecoveryCaseEvent['event_type'], string>> = {
    created: 'Route opened',
    evidence_added: 'Evidence added',
    submitted: 'Submitted',
    chased: 'Chased',
    approved: 'Approved',
    partially_approved: 'Partially approved',
    rejected: 'Rejected',
    appealed: 'Appealed',
    paid: 'Received',
    closed: 'Closed',
  };
  return names[event.event_type] ?? label('workflowStatus', event.event_type);
}

function daysRemaining(value: string | null) {
  if (!value) return null;
  const days = Math.ceil((Date.parse(value) - Date.now()) / 86_400_000);
  return Number.isFinite(days) ? days : null;
}

function windowProgress(created: string, deadline: string | null) {
  if (!deadline) return 0;
  const start = Date.parse(created);
  const end = Date.parse(deadline);
  const total = end - start;
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((Date.now() - start) / total) * 100)));
}

function FactRow({ label: factLabel, value, tone = '#1c1f23', note }: { label: string; value: string; tone?: string; note?: string }) {
  return <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>{factLabel}</span><span style={{ maxWidth: '62%', textAlign: 'right', font: "400 11.5px/1.5 'IBM Plex Mono',monospace", color: tone }}>{value}</span>{note ? <span style={{ marginLeft: 7, font: "400 9.5px/1.5 'IBM Plex Mono',monospace", color: '#64686d' }}>{note}</span> : null}</div>;
}

function LinkedRow({ type, href, value }: { type: string; href: string; value: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "400 10px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{type}</div><div style={{ marginTop: 2, font: "500 11.5px/1.4 'Inter',sans-serif" }}><Link href={href} style={{ color: '#1c1f23', textDecoration: 'none' }}>{value}</Link></div></div></div>;
}

export function RecoveryDetailOperations({ recovery, events, correspondence, tasks, providerCreditEvents }: Props) {
  const partnerName = recovery.partner?.name ?? RECOVERY_OWNER_LABELS[recovery.owner_type] ?? 'External owner';
  const typeLabel = RECOVERY_TYPE_LABELS[recovery.recovery_type] ?? 'Recovery';
  const outstanding = Math.max(0, recovery.amount_sought_minor - recovery.amount_recovered_minor - recovery.amount_written_off_minor);
  const approvedRecorded = recovery.amount_approved_minor > 0 || events.some((event) => event.event_type === 'approved' || event.event_type === 'partially_approved');
  const receivedRecorded = recovery.amount_recovered_minor > 0 || providerCreditEvents.some((event) => ['observed', 'received', 'matched', 'reconciled'].includes(event.event_type) || ['observed', 'received', 'matched', 'reconciled'].includes(event.to_status ?? ''));
  const matchedRecorded = providerCreditEvents.some((event) => event.event_type === 'matched' || ['matched', 'reconciled'].includes(event.to_status ?? ''));
  const reconciledRecorded = providerCreditEvents.some((event) => event.event_type === 'reconciled' || event.to_status === 'reconciled');
  const stageValues = [
    { label: 'Sought', recorded: true, value: formatMoney(recovery.amount_sought_minor, recovery.currency) },
    { label: 'Approved', recorded: approvedRecorded, value: approvedRecorded ? formatMoney(recovery.amount_approved_minor, recovery.currency) : '—' },
    { label: 'Received', recorded: receivedRecorded, value: receivedRecorded ? formatMoney(recovery.amount_recovered_minor, recovery.currency) : '—' },
    { label: 'Matched', recorded: matchedRecorded, value: matchedRecorded ? formatMoney(recovery.amount_recovered_minor, recovery.currency) : '—' },
    { label: 'Reconciled', recorded: reconciledRecorded, value: reconciledRecorded ? formatMoney(recovery.amount_recovered_minor, recovery.currency) : '—' },
  ];
  const lastRecordedIndex = stageValues.reduce((last, stage, index) => stage.recorded ? index : last, 0);
  const heldCount = Math.max(0, recovery.evidence_required.length - recovery.evidence_missing.length);
  const evidenceRows = recovery.evidence_required.slice(0, 6);
  const statusEvents = [
    ...providerCreditEvents.map((event) => ({
      id: `credit-${event.id}`,
      at: event.created_at,
      title: `Credit ${event.event_type.replaceAll('_', ' ')}`,
      detail: `${formatMoney(event.amount_minor, event.currency)} · ${event.reason ?? `${event.from_status ?? 'new'} → ${event.to_status ?? event.event_type}`}`,
      actor: event.financial_entry_id ? 'ledger linked' : 'provider credit',
    })),
    ...events.map((event) => ({ id: `event-${event.id}`, at: event.created_at, title: eventLabel(event), detail: event.note ?? (event.to_status ? `Status recorded as ${RECOVERY_STATUS_LABELS[event.to_status]}` : 'Append-only recovery event'), actor: 'recorded event' })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 4);
  const remaining = daysRemaining(recovery.deadline_at);
  const progress = windowProgress(recovery.created_at, recovery.deadline_at);
  const partnerStats = recovery.partner_statistics;
  const contact = recovery.partner?.contact_email ?? recovery.partner?.contact_url ?? recovery.partner?.contact_instructions ?? 'Unavailable';
  const openTasks = tasks.filter((task) => isActiveWorkTask(task.status));

  return (
    <div data-operations-surface="recovery-detail" style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <section style={{ ...card, padding: '14px 16px 14px', flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}><div style={sectionLabel}>MONEY STAGES</div><div style={{ flex: 1 }}/><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>approval is not receipt · receipt is not reconciled</span></div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            {stageValues.map((stage, index) => {
              const current = index === lastRecordedIndex && !stageValues[index + 1]?.recorded;
              return (
                <div key={stage.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', position: 'relative' }}>
                  {index < stageValues.length - 1 ? <div style={{ position: 'absolute', left: '50%', right: '-50%', top: 9, height: 1.5, background: stageValues[index + 1]?.recorded ? '#1c1f23' : '#e4e3e0' }}/> : null}
                  <div style={{ width: 19, height: 19, zIndex: 1, borderRadius: '50%', background: stage.recorded ? '#1c1f23' : '#fff', boxShadow: stage.recorded ? undefined : current ? 'inset 0 0 0 2px #ff7a30' : 'inset 0 0 0 1.5px #ddd8d1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stage.recorded ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M2.2 5.2 4.2 7.2 7.8 3"/></svg> : null}</div>
                  <span style={{ font: "500 12px/1.3 'Inter',sans-serif", color: stage.recorded || current ? '#1c1f23' : '#64686d' }}>{stage.label}</span>
                  <span style={{ font: "400 13px/1 'IBM Plex Mono',monospace", color: stage.recorded ? '#1c1f23' : '#a7abad' }}>{stage.value}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 18, paddingTop: 13, borderTop: '1px solid #eae8e5' }}><span style={{ flex: 1, font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>Outstanding is {formatMoney(outstanding, recovery.currency)}. Nothing is counted as recovered until a source credit is observed; matching and reconciliation are recorded separately.</span><span style={{ flex: 'none', font: "400 11px/1.5 'IBM Plex Mono',monospace", color: recovery.amount_written_off_minor > 0 ? '#b0431a' : '#64686d' }}>written off: {formatMoney(recovery.amount_written_off_minor, recovery.currency)}</span></div>
        </section>

        <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
          <section style={{ ...card, padding: '12px 15px 10px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 6 }}><div style={sectionLabel}>EVIDENCE PACK</div><div style={{ flex: 1 }}/><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: recovery.evidence_missing.length ? '#7a5310' : '#1a6b43' }}>{heldCount} of {recovery.evidence_required.length} · {recovery.evidence_missing.length} blocking</span></div>
            {evidenceRows.length ? evidenceRows.map((key) => {
              const missing = recovery.evidence_missing.includes(key);
              return <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #f4f2ef' }}><span style={{ width: 7, height: 7, flex: 'none', borderRadius: '50%', background: missing ? '#b0431a' : '#1a7f4b' }}/><span style={{ flex: 1, minWidth: 0, font: "400 12px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{humanizeEvidenceKey(key)}</span><span style={{ flex: 'none', font: "400 10px/1.4 'IBM Plex Mono',monospace", color: missing ? '#b0431a' : '#64686d' }}>{missing ? 'missing' : 'held'}</span></div>;
            }) : <div style={{ padding: '12px 0', borderTop: '1px solid #f4f2ef', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>No evidence requirements are recorded.</div>}
            <div style={{ flex: 1 }}/><div style={{ marginTop: 8, paddingTop: 9, borderTop: '1px solid #e4e3e0', font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>{recovery.evidence_missing.length ? `${recovery.evidence_missing.length} required ${recovery.evidence_missing.length === 1 ? 'item is' : 'items are'} still missing. Filing readiness remains separate from the provider’s eventual decision.` : 'All recorded requirements are held. Completeness does not imply provider approval.'}</div>
          </section>

          <section style={{ ...card, padding: '12px 15px 10px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 6 }}><div style={sectionLabel}>CORRESPONDENCE</div><div style={{ flex: 1 }}/><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{correspondence.length} recorded</span></div>
            {correspondence.length ? correspondence.slice(0, 4).map((item) => {
              const at = item.received_at ?? item.sent_at ?? recovery.updated_at;
              return <div key={item.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}><span style={{ width: 12, flex: 'none', paddingTop: 1, font: "400 11px/1.5 'IBM Plex Mono',monospace", color: '#64686d' }}>{item.direction === 'outbound' ? '↗' : '↘'}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "500 12px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{item.source_url ? <a href={item.source_url} style={{ color: 'inherit' }}>{item.subject ?? `${item.direction} correspondence`}</a> : item.subject ?? `${item.direction} correspondence`}</span><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{formatDateTime(at)}</span></div><div style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>{providerLabel(item.source_provider)} · source reference retained</div></div></div>;
            }) : <div style={{ padding: '12px 0', borderTop: '1px solid #f4f2ef', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>No correspondence has been recorded.</div>}
            <div style={{ flex: 1 }}/><div style={{ marginTop: 8, paddingTop: 9, borderTop: '1px solid #e4e3e0', font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>Unauth records sent and observed correspondence. It does not infer activity inside a provider portal.</div>
          </section>
        </div>

        <section style={{ ...card, padding: '12px 16px 10px', flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 4 }}><div style={sectionLabel}>STATUS EVENTS</div><div style={{ flex: 1 }}/><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>append only</span></div>
          {statusEvents.length ? statusEvents.map((event) => <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid #f4f2ef' }}><span style={{ width: 92, flex: 'none', font: "400 11px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{formatDateTime(event.at)}</span><span style={{ width: 120, flex: 'none', font: "500 12px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{event.title}</span><span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 11.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>{event.detail}</span><span style={{ width: 140, flex: 'none', textAlign: 'right', font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{event.actor}</span></div>) : <div style={{ padding: '12px 0', borderTop: '1px solid #f4f2ef', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>No status events are recorded.</div>}
        </section>
      </div>

      <aside style={{ width: 300, flex: 'none', padding: '12px 13px', borderRadius: 13, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={sectionLabel}>THE CLOCK</div>
        <div style={{ ...card, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 9, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(176,67,26,.3)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, font: "500 12.5px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{partnerName} filing window</span><span style={{ font: "400 12px/1 'IBM Plex Mono',monospace", color: remaining != null && remaining <= 7 ? '#b0431a' : '#7a5310' }}>{remaining == null ? 'unavailable' : remaining < 0 ? `${Math.abs(remaining)}d overdue` : `${remaining} days`}</span></div>
          <div style={{ height: 5, overflow: 'hidden', borderRadius: 3, background: '#f2f0ed' }}><div style={{ width: `${progress}%`, height: '100%', background: remaining != null && remaining <= 7 ? '#b0431a' : '#c98a1a' }}/></div>
          <div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>{recovery.deadline_at ? `Opened ${formatDateAbsolute(recovery.created_at)}, closes ${formatDateAbsolute(recovery.deadline_at)}. Provider position remains separate from recovered money.` : 'No provider filing deadline is recorded. The route remains explicit rather than assuming a window.'}</div>
        </div>

        <div style={sectionLabel}>PARTNER</div>
        <div style={{ ...card, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FactRow label="Partner" value={partnerName}/>
          <FactRow label="Route" value={typeLabel}/>
          <FactRow label="Contact" value={contact}/>
          <FactRow label="Response SLA" value={recovery.partner?.response_sla_hours == null ? 'Unavailable' : `${recovery.partner.response_sla_hours} hours`}/>
          <FactRow label="Paid · observed sample" value={partnerStats?.payRatePercent == null ? 'Unavailable' : `${partnerStats.payRatePercent}%`} tone={partnerStats?.payRatePercent == null ? '#64686d' : '#1a6b43'} note={partnerStats?.sampleSize ? `of ${partnerStats.sampleSize}` : undefined}/>
          <FactRow label="Median days to respond" value={partnerStats?.medianDays == null ? 'Unavailable' : String(partnerStats.medianDays)}/>
        </div>

        <div style={sectionLabel}>LINKED RECORDS</div>
        <div style={{ ...card, padding: '3px 13px 9px', display: 'flex', flexDirection: 'column' }}>
          <LinkedRow type="CASE" href={`/cases/${recovery.support_payout_case_id}`} value={caseRef(recovery.support_payout_case_id)}/>
          {recovery.loss_case_id ? <LinkedRow type="LOSS ENTRY" href={`/financials/losses/${recovery.loss_case_id}`} value={lossRef(recovery.loss_case_id)}/>: null}
          {recovery.support_payout_case?.source_order_id ? <LinkedRow type="ORDER" href={`/orders/${recovery.support_payout_case.source_order_id}`} value={recovery.support_payout_case.order_number ?? hashId(recovery.support_payout_case.source_order_id)}/>: null}
          {recovery.support_payout_case?.source_ticket_id ? <LinkedRow type="SUPPORT TICKET" href={`/tickets/${recovery.support_payout_case.source_ticket_id}`} value={recovery.support_payout_case.ticket_external_id ?? `Ticket ${hashId(recovery.support_payout_case.source_ticket_id)}`}/>: null}
          <LinkedRow type="RULEBOOK" href="/controls/rules/recovery" value={`${partnerName} · ${typeLabel.toLowerCase()}`}/>
        </div>
        {openTasks.length ? <><p style={{ fontSize: 11, color: '#64686d' }}>These tasks track recovery follow-up separately from the case decision and money outcome.</p><div style={sectionLabel}>OPEN WORK · {openTasks.length} tasks</div><div style={{ ...card, padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>{openTasks.map((task) => <div key={task.id}><div style={{ font: "500 11.5px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{task.title}</div><div style={{ marginTop: 2, font: "400 10.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>{task.due_at ? `Due ${formatDateAbsolute(task.due_at)}` : 'No due date'} · {label('workflowStatus', task.status)}</div></div>)}</div></> : null}
        <div style={{ flex: 1 }}/><div style={{ paddingTop: 10, borderTop: '1px solid #e4e3e0', font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>Recording an outcome does not move money. It records what the partner said; reconciliation determines whether value arrived.</div>
      </aside>
    </div>
  );
}
