import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { DetailPageShell, EvidenceChecklist, InsetGroup, JoinedSection, StatusBadge } from '@/components/ui';
import { getRecoveryCase } from '@/lib/recoveries/store';
import { RECOVERY_STATUS_LABELS, RECOVERY_OWNER_LABELS, type RecoveryCase, type RecoveryCaseEvent } from '@/lib/recoveries/types';
import { RECOVERY_TYPE_LABELS } from '@/lib/partners/types';
import { formatDateAbsolute, formatDateTime } from '@/lib/utils/format';
import { label } from '@/lib/ui/labels';
import { providerLabel } from '@/lib/ui/merchantCopy';
import { humanizeEvidenceKey } from '@/components/claims/payout/payoutCopy';
import { RecoveryProgress } from '@/components/recoveries/RecoveryVisuals';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

type CorrespondenceRow = {
  id: string;
  direction: string;
  source_provider: string;
  source_record_id: string;
  subject: string | null;
  source_url: string | null;
};

type RecoveryTaskRow = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  blocking_reason: string | null;
};

function nextActionFor(recovery: RecoveryCase) {
  if (recovery.status === 'evidence_needed') return 'Complete the missing evidence before the recovery can be submitted.';
  if (recovery.status === 'draft') return 'Review the evidence pack and mark it ready when it is complete.';
  if (recovery.status === 'ready_to_submit') return 'Submit to the external owner, then record that submission.';
  if (recovery.status === 'chase_due') return 'Contact the external owner and record the follow-up.';
  if (recovery.status === 'submitted' || recovery.status === 'waiting_response') return 'Wait for the external owner’s response; record any correspondence here.';
  if (recovery.status === 'approved' || recovery.status === 'partially_approved') return 'Record the amount actually received or credited; approval is not cash recovery.';
  if (recovery.status === 'rejected') return 'Review the rejection and decide whether an appeal is appropriate.';
  if (recovery.status === 'appealed') return 'Wait for the appeal outcome and preserve the source correspondence.';
  if (recovery.status === 'paid') return 'Recovery is reconciled; review the linked financial record if anything changes.';
  return 'This recovery is closed as unrecoverable.';
}

function eventLabel(event: RecoveryCaseEvent) {
  if (event.event_type === 'status_changed') return 'Recovery status changed';
  return label('workflowStatus', event.event_type);
}

export default async function RecoveryDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/overview');

  const recovery = await getRecoveryCase(serviceClient, ctx.merchantId, id);
  if (!recovery) redirect('/financials/recovery');

  const [{ data: eventRows }, { data: correspondenceRows }, { data: taskRows }] = await Promise.all([
    serviceClient
      .from(TABLES.RECOVERY_CASE_EVENTS)
      .select('id,event_type,from_status,to_status,note,metadata,created_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('recovery_case_id', id)
      .order('created_at', { ascending: false }),
    recovery.loss_case_id
      ? serviceClient
        .from(TABLES.EXTERNAL_CORRESPONDENCE)
        .select('id,direction,channel,source_provider,source_record_id,subject,sent_at,received_at,source_url')
        .eq('merchant_id', ctx.merchantId)
        .eq('loss_case_id', recovery.loss_case_id)
        .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    serviceClient
      .from(TABLES.WORK_TASKS)
      .select('id,title,status,priority,owner_user_id,due_at,blocking_reason')
      .eq('merchant_id', ctx.merchantId)
      .eq('recovery_case_id', id)
      .order('updated_at', { ascending: false }),
  ]);

  const events = (eventRows ?? []) as RecoveryCaseEvent[];
  const correspondence = (correspondenceRows ?? []) as CorrespondenceRow[];
  const tasks = (taskRows ?? []) as RecoveryTaskRow[];
  const outstanding = Math.max(0, recovery.amount_sought_minor - recovery.amount_recovered_minor - recovery.amount_written_off_minor);
  const recoveryType = RECOVERY_TYPE_LABELS[recovery.recovery_type] ?? 'Recovery';
  const title = `${recovery.partner?.name ?? RECOVERY_OWNER_LABELS[recovery.owner_type] ?? 'External owner'} ${recoveryType.toLowerCase()} recovery`;
  const evidenceItems = recovery.evidence_required.map((key) => ({
    label: humanizeEvidenceKey(key),
    complete: !recovery.evidence_missing.includes(key),
  }));

  return (
    <DetailPageShell
      backHref="/financials/recovery"
      backLabel="Recovery board"
      eyebrow="Recovery"
      title={title}
      subtitle={recovery.partner?.name ? `${recoveryType} · ${RECOVERY_OWNER_LABELS[recovery.owner_type]}` : recoveryType}
      statusBadge={<StatusBadge family="recoveryStatus" value={recovery.status} />}
      meta={[
        { label: 'Deadline', value: recovery.deadline_at ? formatDateAbsolute(recovery.deadline_at) : 'No deadline recorded' },
        { label: 'Next chase', value: recovery.next_chase_at ? formatDateAbsolute(recovery.next_chase_at) : 'Not scheduled' },
        { label: 'Evidence', value: recovery.evidence_complete ? 'Complete' : `${recovery.evidence_missing.length} item${recovery.evidence_missing.length === 1 ? '' : 's'} missing` },
        { label: 'Updated', value: formatDateTime(recovery.updated_at) },
      ]}
      actions={<Link href="/financials/recovery" className="ua-text-label rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 py-2 font-medium no-underline hover:bg-[var(--ua-surface-hover)]">Open board actions</Link>}
      metricStrip={
        <RecoveryProgress
          currency={recovery.currency}
          steps={[
            { key: 'sought', label: 'Sought', valueMinor: recovery.amount_sought_minor, detail: 'Amount actively pursued' },
            { key: 'approved', label: 'Approved', valueMinor: recovery.amount_approved_minor, detail: 'Source-approved, not cash' },
            { key: 'recovered', label: 'Recovered', valueMinor: recovery.amount_recovered_minor, detail: 'Received or credited' },
            { key: 'outstanding', label: 'Outstanding', valueMinor: outstanding, detail: recovery.amount_written_off_minor > 0 ? 'After closed balance' : 'Still being pursued' },
          ]}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <section className="ua-focal-panel p-4" aria-labelledby="recovery-evidence-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="recovery-evidence-title" className="ua-text-section-title text-[var(--ua-text-primary)]">Evidence readiness</h2>
              <p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">The recovery pack is the working surface. Missing source facts stay explicit until a connected source supplies them.</p>
            </div>
            <StatusBadge family="recoveryStatus" value={recovery.evidence_complete ? 'ready_to_submit' : 'evidence_needed'} />
          </div>
          {evidenceItems.length > 0 ? (
            <div className="mt-4"><EvidenceChecklist items={evidenceItems} /></div>
          ) : (
            <p className="ua-text-body mt-4 text-[var(--ua-text-tertiary)]">No evidence requirements are recorded for this recovery route.</p>
          )}
          {!recovery.evidence_complete && recovery.evidence_missing.length > 0 ? (
            <p className="ua-text-caption-role mt-3">Missing: {recovery.evidence_missing.map(humanizeEvidenceKey).join(', ')}.</p>
          ) : null}
          <InsetGroup className="mt-4 p-3">
            <p className="ua-text-label font-medium">Next action</p>
            <p className="ua-text-body mt-1 text-[var(--ua-text-primary)]">{nextActionFor(recovery)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/financials/recovery" className="ua-text-dense font-medium text-[var(--ua-accent-600)]">Record an action on the board</Link>
              <Link href={`/cases/${recovery.support_payout_case_id}`} className="ua-text-dense font-medium text-[var(--ua-accent-600)]">Open linked case</Link>
              {recovery.loss_case_id ? <Link href={`/financials/losses/${recovery.loss_case_id}`} className="ua-text-dense font-medium text-[var(--ua-accent-600)]">Open linked loss</Link> : null}
            </div>
          </InsetGroup>
        </section>

        <JoinedSection className="overflow-hidden" aria-labelledby="recovery-context-title">
          <div className="border-b border-[var(--ua-border-subtle)] px-4 py-3">
            <h2 id="recovery-context-title" className="ua-text-section-title text-[var(--ua-text-primary)]">Correspondence, tasks, and activity</h2>
            <p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">External messages, owned work, and immutable recovery events in one record context.</p>
          </div>
          <div className="grid divide-y divide-[var(--ua-border-subtle)] xl:grid-cols-3 xl:divide-x xl:divide-y-0">
            <section className="p-4" aria-labelledby="recovery-correspondence-title">
              <h3 id="recovery-correspondence-title" className="ua-text-working-title text-[var(--ua-text-primary)]">Correspondence</h3>
              {correspondence.length ? <ul className="mt-3 space-y-3">{correspondence.map((item) => <li key={item.id} className="ua-text-dense text-[var(--ua-text-secondary)]"><p><span className="font-medium capitalize text-[var(--ua-text-primary)]">{item.direction}</span> · {providerLabel(item.source_provider)}</p><p className="mt-1">{item.subject ?? item.source_record_id}</p>{item.source_url ? <a className="ua-text-label mt-1 inline-block font-medium text-[var(--ua-accent-600)]" href={item.source_url}>Open source</a> : null}</li>)}</ul> : <p className="ua-text-body mt-3 text-[var(--ua-text-tertiary)]">No external correspondence is linked.</p>}
            </section>
            <section className="p-4" aria-labelledby="recovery-tasks-title">
              <h3 id="recovery-tasks-title" className="ua-text-working-title text-[var(--ua-text-primary)]">Tasks</h3>
              {tasks.length ? <ul className="mt-3 space-y-3">{tasks.map((task) => <li key={task.id} className="ua-text-dense text-[var(--ua-text-secondary)]"><p className="font-medium text-[var(--ua-text-primary)]">{task.title}</p><p className="mt-1">{label('workflowStatus', task.status)}{task.due_at ? ` · due ${formatDateAbsolute(task.due_at)}` : ''}</p>{task.blocking_reason ? <p className="ua-text-caption-role mt-1">Blocked: {task.blocking_reason}</p> : null}</li>)}</ul> : <p className="ua-text-body mt-3 text-[var(--ua-text-tertiary)]">No recovery tasks are linked.</p>}
            </section>
            <section className="p-4" aria-labelledby="recovery-activity-title">
              <h3 id="recovery-activity-title" className="ua-text-working-title text-[var(--ua-text-primary)]">Activity</h3>
              {events.length ? <ul className="mt-3 space-y-3">{events.map((event) => <li key={event.id} className="ua-text-dense text-[var(--ua-text-secondary)]"><p className="font-medium text-[var(--ua-text-primary)]">{eventLabel(event)}</p>{event.from_status && event.to_status ? <p className="mt-1">{RECOVERY_STATUS_LABELS[event.from_status]} → {RECOVERY_STATUS_LABELS[event.to_status]}</p> : null}{event.note ? <p className="mt-1">{event.note}</p> : null}<time className="ua-text-metadata mt-1 block" dateTime={event.created_at}>{formatDateTime(event.created_at)}</time></li>)}</ul> : <p className="ua-text-body mt-3 text-[var(--ua-text-tertiary)]">No recovery activity yet.</p>}
            </section>
          </div>
        </JoinedSection>
      </div>
    </DetailPageShell>
  );
}
