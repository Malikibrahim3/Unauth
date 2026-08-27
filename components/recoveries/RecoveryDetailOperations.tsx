import Link from 'next/link';
import type { RecoveryCase, RecoveryCaseEvent } from '@/lib/recoveries/types';
import { RECOVERY_OWNER_LABELS, RECOVERY_STATUS_LABELS } from '@/lib/recoveries/types';
import { RECOVERY_TYPE_LABELS } from '@/lib/partners/types';
import { formatDateAbsolute, formatDateMode, formatDateTime, formatMoney } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import { humanizeEvidenceKey } from '@/components/claims/payout/payoutCopy';
import { label } from '@/lib/ui/labels';
import { providerLabel } from '@/lib/ui/merchantCopy';
import styles from './RecoveryDetailOperations.module.css';

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

function recoveryRef(id: string) {
  return `REC-${hashId(id).slice(1)}`;
}

function caseRef(id: string) {
  return `CASE-${hashId(id).slice(1)}`;
}

function lossRef(id: string) {
  return `LDG-${hashId(id).slice(1)}`;
}

function eventLabel(event: RecoveryCaseEvent) {
  if (event.event_type === 'status_changed' && event.to_status) return `Recovery status changed to ${RECOVERY_STATUS_LABELS[event.to_status]}`;
  const map: Partial<Record<RecoveryCaseEvent['event_type'], string>> = {
    created: 'Recovery opened from responsibility assessment',
    evidence_added: 'Evidence added to the recovery pack',
    submitted: 'Claim submitted to the external partner',
    chased: 'Partner chase recorded',
    approved: 'Partner approval recorded',
    partially_approved: 'Partial partner approval recorded',
    rejected: 'Partner rejection recorded',
    appealed: 'Appeal recorded',
    paid: 'Recovered cash recorded',
    closed: 'Recovery closed',
  };
  return map[event.event_type] ?? label('workflowStatus', event.event_type);
}

function eventTone(event: RecoveryCaseEvent) {
  if (event.event_type === 'chased' || event.to_status === 'chase_due' || event.to_status === 'waiting_response') return 'warning';
  if (['created', 'evidence_added', 'submitted', 'approved', 'paid'].includes(event.event_type)) return 'positive';
  return 'neutral';
}

function dateLabel(value: string | null) {
  return value ? formatDateMode(value, 'recent') : '—';
}

function deadlineDetail(deadline: string | null) {
  if (!deadline) return 'No deadline recorded';
  const days = Math.ceil((Date.parse(deadline) - Date.now()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Due today';
  return `${days} days left`;
}

function nextChaseDetail(nextChase: string | null) {
  if (!nextChase) return 'Not scheduled';
  const days = Math.ceil((Date.parse(nextChase) - Date.now()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Due today';
  return `${days} days`;
}

export function RecoveryDetailOperations({ recovery, events, correspondence, tasks, providerCreditEvents }: Props) {
  const partnerName = recovery.partner?.name ?? RECOVERY_OWNER_LABELS[recovery.owner_type] ?? 'External owner';
  const typeLabel = RECOVERY_TYPE_LABELS[recovery.recovery_type] ?? 'Recovery';
  const outstanding = Math.max(0, recovery.amount_sought_minor - recovery.amount_recovered_minor - recovery.amount_written_off_minor);
  const approvedRecorded = recovery.amount_approved_minor > 0 || events.some((event) => event.event_type === 'approved' || event.event_type === 'partially_approved');
  const receivedCreditRecorded = recovery.amount_recovered_minor > 0 || providerCreditEvents.some((event) => ['observed', 'received', 'matched', 'reconciled'].includes(event.event_type) || ['observed', 'received', 'matched', 'reconciled'].includes(event.to_status ?? ''));
  const matchedCreditRecorded = providerCreditEvents.some((event) => event.event_type === 'matched' || ['matched', 'reconciled'].includes(event.to_status ?? ''));
  const reconciledCreditRecorded = providerCreditEvents.some((event) => event.event_type === 'reconciled' || event.to_status === 'reconciled');
  const writtenOffRecorded = recovery.amount_written_off_minor > 0 || recovery.status === 'closed_unrecoverable';
  const submittedEvent = events.find((event) => event.event_type === 'submitted' || event.to_status === 'submitted');
  const chasedEvent = events.find((event) => event.event_type === 'chased' || event.to_status === 'chase_due' || event.to_status === 'waiting_response');
  const openedEvent = events.find((event) => event.event_type === 'created') ?? events.at(-1);
  const currentStage = recovery.status === 'chase_due' || recovery.status === 'waiting_response' ? 'Chased' : RECOVERY_STATUS_LABELS[recovery.status];
  const timelineRecordedX = chasedEvent ? 208 : submittedEvent ? 124 : 40;
  const combinedEvents = [
    ...providerCreditEvents.map((event) => ({
      id: `provider-credit-${event.id}`,
      at: event.created_at,
      title: `Provider credit ${event.event_type.replaceAll('_', ' ')}`,
      detail: `${formatMoney(event.amount_minor, event.currency)} · ${event.from_status ?? 'new'} → ${event.to_status ?? event.event_type}${event.financial_entry_id ? ' · ledger entry linked' : ''}${event.reason ? ` · ${event.reason}` : ''}`,
      tone: event.event_type === 'dismissed' || event.event_type === 'reversed' ? 'warning' : event.event_type === 'matched' || event.event_type === 'reconciled' ? 'positive' : 'neutral',
      href: null,
    })),
    ...correspondence.map((item) => ({
      id: `correspondence-${item.id}`,
      at: item.received_at ?? item.sent_at ?? recovery.updated_at,
      title: item.subject ?? `${item.direction.charAt(0).toUpperCase()}${item.direction.slice(1)} correspondence via ${providerLabel(item.source_provider)}`,
      detail: `${providerLabel(item.source_provider)} · ${item.source_record_id}`,
      tone: item.direction === 'outbound' ? 'warning' : 'positive',
      href: item.source_url,
    })),
    ...events.map((event) => ({
      id: `event-${event.id}`,
      at: event.created_at,
      title: eventLabel(event),
      detail: event.note ?? 'Unauth recovery ledger',
      tone: eventTone(event),
      href: null,
    })),
  ].sort((left, right) => Date.parse(right.at) - Date.parse(left.at));
  const claimRef = recovery.partner?.external_reference ?? 'Claim reference unavailable';

  return (
    <div className={styles.stack} data-operations-surface="recovery-detail">
      <section className={`${styles.card} ${styles.summary}`}>
        <div className={styles.summaryIdentity}>
          <div className={styles.summaryBadges}>
            <span className={styles.reference}>{recoveryRef(recovery.id)}</span>
            <span className={styles.badge} data-tone={['paid', 'approved'].includes(recovery.status) ? 'positive' : 'warning'}>{RECOVERY_STATUS_LABELS[recovery.status]}</span>
            <span className={styles.badge}>{typeLabel}</span>
          </div>
          <h2 className={styles.summaryTitle}>{partnerName} · claim {claimRef}</h2>
          <p className={styles.summaryMeta}>
            Opened {formatDateAbsolute(recovery.created_at)} · for <Link href={`/cases/${recovery.support_payout_case_id}`}>{caseRef(recovery.support_payout_case_id)}</Link>
            {recovery.loss_case_id ? <> and loss <Link href={`/financials/losses/${recovery.loss_case_id}`}>{lossRef(recovery.loss_case_id)}</Link></> : null} · {recovery.currency}
          </p>
        </div>
        <div className={styles.summaryStats}>
          <div><span>Outstanding</span><strong className={styles.statMoney}>{formatMoney(outstanding, recovery.currency)}</strong><small>{recovery.currency}</small></div>
          <div><span>Claim deadline</span><strong className={styles.statDuration}>{dateLabel(recovery.deadline_at)}</strong><small>{deadlineDetail(recovery.deadline_at)}</small></div>
          <div><span>Next chase</span><strong className={styles.statDuration}>{dateLabel(recovery.next_chase_at)}</strong><small>{nextChaseDetail(recovery.next_chase_at)}</small></div>
        </div>
      </section>

      <section className={`${styles.card} ${styles.financialChain}`} aria-labelledby="recovery-financial-chain-title">
        <header>
          <h2 id="recovery-financial-chain-title">External result to reconciled money</h2>
          <p>Each position needs its own recorded fact. Later stages are never inferred from partner approval.</p>
        </header>
        <ol>
          <li data-state={approvedRecorded ? 'recorded' : 'waiting'}><span>1</span><div><strong>Provider position</strong><small>{approvedRecorded ? 'Approval recorded' : 'No approval recorded'}</small></div></li>
          <li data-state={receivedCreditRecorded ? 'recorded' : 'waiting'}><span>2</span><div><strong>Received credit</strong><small>{receivedCreditRecorded ? formatMoney(recovery.amount_recovered_minor, recovery.currency) : 'No provider credit observed'}</small></div></li>
          <li data-state={matchedCreditRecorded ? 'recorded' : 'waiting'}><span>3</span><div><strong>Matched credit</strong><small>{matchedCreditRecorded ? 'Source credit matched to this recovery' : 'No source-to-recovery match recorded'}</small></div></li>
          <li data-state={reconciledCreditRecorded ? 'recorded' : 'waiting'}><span>4</span><div><strong>Reconciled money</strong><small>{reconciledCreditRecorded ? 'Ledger reconciliation recorded' : 'No reconciliation event recorded'}</small></div></li>
        </ol>
      </section>

      <div className={styles.leadGrid}>
        <section className={`${styles.card} ${styles.panel}`}>
          <h2 className={styles.panelTitle}>Where this recovery stands against its deadline</h2>
          <p className={styles.panelCopy}>External stages only. A stage is recorded when the partner acts, never inferred.</p>
          <svg className={styles.timelineSvg} viewBox="0 0 640 112" role="img" aria-label={`Recovery timeline from ${formatDateAbsolute(recovery.created_at)} to ${recovery.deadline_at ? formatDateAbsolute(recovery.deadline_at) : 'an unavailable deadline'}, currently ${RECOVERY_STATUS_LABELS[recovery.status]}`}>
            <line x1="40" y1="48" x2="600" y2="48" className={styles.timelineTrack} />
            <line x1="40" y1="48" x2={timelineRecordedX} y2="48" className={styles.timelineRecorded} />
            <circle cx="40" cy="48" r="5" className={styles.recordedDot} />
            <circle cx="124" cy="48" r="5" className={submittedEvent ? styles.recordedDot : styles.futureDot} />
            <circle cx="208" cy="48" r="5.5" className={chasedEvent ? styles.currentDot : styles.futureDot} />
            <circle cx="404" cy="48" r="4" className={styles.futureDot} />
            <circle cx="600" cy="48" r="4" className={styles.deadlineDot} />
            <text x="40" y="32" textAnchor="middle" className={styles.pointLabel}>Opened</text>
            <text x="40" y="68" textAnchor="middle">{dateLabel(openedEvent?.created_at ?? recovery.created_at)}</text>
            <text x="124" y="32" textAnchor="middle" className={styles.pointLabel}>Submitted</text>
            <text x="124" y="68" textAnchor="middle">{dateLabel(submittedEvent?.created_at ?? null)}</text>
            <text x="208" y="32" textAnchor="middle" className={chasedEvent ? styles.pointLabelCurrent : styles.pointLabel}>{currentStage}</text>
            <text x="208" y="68" textAnchor="middle">{dateLabel(chasedEvent?.created_at ?? recovery.updated_at)}</text>
            <text x="404" y="32" textAnchor="middle" className={styles.pointLabel}>Response due</text>
            <text x="404" y="68" textAnchor="middle">{dateLabel(recovery.next_chase_at)}</text>
            <text x="600" y="32" textAnchor="middle" className={styles.pointLabelDeadline}>Claim deadline</text>
            <text x="600" y="68" textAnchor="middle">{dateLabel(recovery.deadline_at)}</text>
            <text x="40" y="98">Approval, payment and closure are drawn only after those external facts are recorded.</text>
          </svg>
          <div className={styles.timelineFooter}>
            <span><i data-tone="recorded" />Recorded</span><span><i data-tone="current" />Current stage</span><span><i />Not yet recorded</span><span><i data-tone="deadline" />Deadline</span>
            <p>{recovery.last_chased_at ? `Last chased ${formatDateAbsolute(recovery.last_chased_at)} · ${nextChaseDetail(recovery.next_chase_at)} until the next chase` : 'No partner chase has been recorded.'}</p>
          </div>
        </section>

        <section className={`${styles.card} ${styles.panel}`}>
          <h2 className={styles.panelTitle}>Amounts</h2>
          <p className={styles.panelCopy}>Currency is fixed by the loss. Nothing is converted.</p>
          <div className={styles.rows}>
            <div className={styles.amountRow}><div><div className={styles.rowLabel}>Sought from partner</div><div className={styles.rowDetail}>Bounded by confirmed loss on {caseRef(recovery.support_payout_case_id)}</div></div><div className={styles.amountValue}>{formatMoney(recovery.amount_sought_minor, recovery.currency)}</div></div>
            <div className={styles.amountRow}><div><div className={styles.rowLabel}>Approved by partner</div><div className={styles.rowDetail}>{approvedRecorded ? 'Recorded external approval; approval is not recovered cash' : 'No approval decision received yet'}</div></div><div className={styles.amountValue} data-state={approvedRecorded ? undefined : 'unavailable'}>{approvedRecorded ? formatMoney(recovery.amount_approved_minor, recovery.currency) : '— Unavailable'}</div></div>
            <div className={styles.amountRow}><div><div className={styles.rowLabel}>Recovered cash</div><div className={styles.rowDetail}>{recovery.amount_recovered_minor === 0 ? 'Verified zero — nothing has been paid' : 'Received or credited and recorded in the ledger'}</div></div><div className={styles.amountValue}>{formatMoney(recovery.amount_recovered_minor, recovery.currency)}</div></div>
            <div className={styles.amountRow}><div><div className={styles.rowLabel}>Outstanding</div><div className={styles.rowDetail}>{recovery.deadline_at ? `Still claimable until ${formatDateAbsolute(recovery.deadline_at)}` : 'Claim deadline unavailable'}</div></div><div className={styles.amountValue}>{formatMoney(outstanding, recovery.currency)}</div></div>
            <div className={styles.amountRow}><div><div className={styles.rowLabel}>Written off</div><div className={styles.rowDetail}>{writtenOffRecorded ? 'Append-only write-off recorded on this recovery' : 'Nothing has been abandoned on this recovery'}</div></div><div className={styles.amountValue} data-state={writtenOffRecorded ? undefined : 'unavailable'}>{writtenOffRecorded ? formatMoney(recovery.amount_written_off_minor, recovery.currency) : '— No records'}</div></div>
          </div>
        </section>
      </div>

      <div className={styles.pairGrid}>
        <section className={`${styles.card} ${styles.panel}`}>
          <h2 className={styles.panelTitle}>Evidence the partner requires</h2>
          <p className={styles.panelCopy}>From the {partnerName} agreement. A missing requirement blocks approval, not submission.</p>
          <div className={styles.rows}>
            {recovery.evidence_required.length ? recovery.evidence_required.map((key) => {
              const missing = recovery.evidence_missing.includes(key);
              return <div className={styles.evidenceRow} key={key}><div><div className={styles.rowLabel}>{humanizeEvidenceKey(key)}</div><div className={styles.rowDetail}>{missing ? 'Missing · no supporting source record is attached' : 'Held · retained in the recovery evidence pack'}</div></div><strong data-state={missing ? 'missing' : 'held'}>{missing ? 'Missing' : 'Held'}</strong></div>;
            }) : <p className={styles.empty}>No evidence requirements are recorded for this recovery route.</p>}
          </div>
          {recovery.evidence_required.length ? <p className={styles.empty}>{recovery.evidence_required.length - recovery.evidence_missing.length} of {recovery.evidence_required.length} recorded requirements are held. Missing evidence remains explicit.</p> : null}
        </section>

        <section className={`${styles.card} ${styles.panel}`}>
          <h2 className={styles.panelTitle}>Correspondence and status events</h2>
          <p className={styles.panelCopy}>Append-only recovery, correspondence, credit, match, reconciliation, reversal, and write-off facts.</p>
          <div className={styles.rows}>
            {combinedEvents.length ? combinedEvents.map((item) => <div className={styles.eventRow} key={item.id}><i className={styles.eventDot} data-tone={item.tone} /><div><div className={styles.rowLabel}>{item.href ? <a href={item.href}>{item.title}</a> : item.title}</div><div className={styles.rowDetail}>{item.detail} · {formatDateTime(item.at)}</div></div></div>) : <p className={styles.empty}>No correspondence or recovery status events are recorded.</p>}
          </div>
        </section>
      </div>

      <div className={styles.tripleGrid}>
        <section className={`${styles.card} ${styles.panel}`}>
          <h2 className={styles.panelTitle}>Partner agreement</h2>
          <p className={styles.panelCopy}>Held in Agreements and applied to every claim on this partner.</p>
          <dl className={styles.factList}>
            <dt>Agreement</dt><dd>{recovery.partner ? `${partnerName} recovery terms` : '— Unavailable'}</dd>
            <dt>Effective</dt><dd>{recovery.partner ? formatDateAbsolute(recovery.partner.created_at) : '— Unavailable'}</dd>
            <dt>Claim window</dt><dd>{recovery.deadline_at ? `Open until ${formatDateAbsolute(recovery.deadline_at)}` : '— Unavailable'}</dd>
            <dt>Cap per claim</dt><dd>— Unavailable</dd>
            <dt>Channel</dt><dd>{recovery.partner?.default_contact_channel ? recovery.partner.default_contact_channel.replaceAll('_', ' ') : '— Unavailable'}</dd>
            <dt>Confidence</dt><dd>— Unavailable</dd>
          </dl>
        </section>

        <section className={`${styles.card} ${styles.panel}`}>
          <h2 className={styles.panelTitle}>Open tasks</h2>
          <p className={styles.panelCopy}>Tracked in the Work queue against this recovery.</p>
          <div className={styles.rows}>{tasks.length ? tasks.map((task) => <div className={styles.factRow} key={task.id} style={{ padding: '9px 0' }}><div className={styles.rowLabel}>{task.title}</div><div className={styles.rowDetail}>{task.due_at ? `Due ${formatDateAbsolute(task.due_at)}` : 'No due date'} · {label('workflowStatus', task.status)}{task.blocking_reason ? ` · blocked: ${task.blocking_reason}` : ''}</div></div>) : <p className={styles.empty}>No open tasks are linked to this recovery.</p>}</div>
        </section>

        <section className={`${styles.card} ${styles.panel}`}>
          <h2 className={styles.panelTitle}>Linked records</h2>
          <p className={styles.panelCopy}>The thread this recovery belongs to.</p>
          <div className={styles.rows}>
            <Link className={styles.recordRow} href={`/cases/${recovery.support_payout_case_id}`}><b>{caseRef(recovery.support_payout_case_id)}</b><span>{typeLabel} · {label('workflowStatus', recovery.support_payout_case?.status ?? 'open')}</span></Link>
            {recovery.loss_case_id ? <Link className={styles.recordRow} href={`/financials/losses/${recovery.loss_case_id}`}><b>{lossRef(recovery.loss_case_id)}</b><span>Confirmed loss · {formatMoney(recovery.amount_sought_minor, recovery.currency)}</span></Link> : null}
            {recovery.support_payout_case?.source_order_id ? <Link className={styles.recordRow} href={`/orders/${recovery.support_payout_case.source_order_id}`}><b>{recovery.support_payout_case.order_number ?? `Order ${hashId(recovery.support_payout_case.source_order_id)}`}</b><span>Order · source record</span></Link> : null}
            {recovery.support_payout_case?.source_ticket_id ? <Link className={styles.recordRow} href={`/tickets/${recovery.support_payout_case.source_ticket_id}`}><b>{recovery.support_payout_case.ticket_external_id ?? `Ticket ${hashId(recovery.support_payout_case.source_ticket_id)}`}</b><span>Support ticket · source record</span></Link> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
