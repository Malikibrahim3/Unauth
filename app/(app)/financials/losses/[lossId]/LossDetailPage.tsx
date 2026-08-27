import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, Check, RefreshCw } from 'lucide-react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { getLossReadModel } from '@/lib/losses/readModel';
import { LossActions } from '@/components/losses/LossActions';
import { UnavailableValue } from '@/components/ui';
import { formatDateAbsolute, formatDateTime, formatMoneyOrDash } from '@/lib/utils/format';
import { humanise, label as enumLabel } from '@/lib/ui/labels';
import { hashId } from '@/lib/ui/displayRef';
import { providerLabel } from '@/lib/ui/merchantCopy';
import { TABLES } from '@/lib/supabase/tables';
import { recoverySoughtAmount } from '@/lib/recoveries/amounts';
import styles from './LossDetailOperations.module.css';

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

type NormalizedRecoveryRow = RecoveryRow & {
  amount_sought_minor: number;
  amount_approved_minor: number;
  amount_recovered_minor: number;
  amount_written_off_minor: number;
};

type TimelineItem = {
  id: string;
  at: string;
  actor: string;
  action: string;
  tone: 'blue' | 'green' | 'amber' | 'grey';
};

type NavigationRow = { id: string; updated_at: string };
type PartnerLossRow = { id: string; status: string; created_at: string; updated_at: string };
type PartnerRecoveryRow = {
  loss_case_id: string | null;
  status: string;
  eligible_loss_amount: number | null;
  amount_recovered: number | null;
  created_at: string;
  updated_at: string;
};

const money = (minor: number | null | undefined, currency: string | null | undefined) => formatMoneyOrDash(minor, currency);

// §15.1 canonical outcome mapping — these `lossStatus` values are a confirmed,
// ledger-recorded loss (the `realised` outcome), not merely informational.
const REALISED_LOSS_STATUSES = new Set(['denied', 'expired', 'closed_unrecoverable']);

function humaniseField(value: unknown) {
  return typeof value === 'string' && value ? humanise(value) : 'Unavailable';
}

function daysBetween(start: string, end: string) {
  const value = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
  return Number.isFinite(value) ? Math.max(0, value) : null;
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const days = Math.ceil((Date.parse(value) - Date.now()) / 86_400_000);
  return Number.isFinite(days) ? days : null;
}

function activityItems(model: NonNullable<Awaited<ReturnType<typeof getLossReadModel>>>): TimelineItem[] {
  return [
    ...model.events.map((event) => ({
      id: `event:${event.id}`,
      at: event.created_at,
      actor: event.source_provider ? providerLabel(event.source_provider) : 'Unauth',
      action: humaniseField(event.event_type),
      tone: 'blue' as const,
    })),
    ...model.correspondence.map((item) => ({
      id: `correspondence:${item.id}`,
      at: item.received_at ?? item.sent_at ?? item.created_at,
      actor: item.source_provider ? providerLabel(item.source_provider) : 'Partner',
      action: `${humaniseField(item.direction)} correspondence${item.subject ? ` — ${item.subject}` : ''}`,
      tone: item.direction === 'inbound' ? 'green' as const : 'grey' as const,
    })),
    ...model.tasks.map((task) => ({
      id: `task:${task.id}`,
      at: task.updated_at,
      actor: 'Operations',
      action: `${task.title} · ${enumLabel('workflowStatus', task.status)}`,
      tone: task.status === 'blocked' ? 'amber' as const : 'grey' as const,
    })),
  ].sort((left, right) => Date.parse(right.at) - Date.parse(left.at));
}

function HeaderLink({ children, href, primary = false }: { children: ReactNode; href: string; primary?: boolean }) {
  return <Link href={href} data-primary={primary}>{children}</Link>;
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

  const navigationResult = await client
    .from(TABLES.LOSS_CASES)
    .select('id,updated_at')
    .eq('merchant_id', ctx.merchantId)
    .order('updated_at', { ascending: false })
    .limit(200);
  const navigationRows = (navigationResult.data ?? []) as NavigationRow[];
  const navigationIndex = navigationRows.findIndex((row) => row.id === id);
  const previousId = navigationIndex > 0 ? navigationRows[navigationIndex - 1]?.id ?? null : null;
  const nextId = navigationIndex >= 0 && navigationIndex < navigationRows.length - 1 ? navigationRows[navigationIndex + 1]?.id ?? null : null;

  const partnerSince = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const partnerLossResult = model.loss.counterparty_name
    ? await client
      .from(TABLES.LOSS_CASES)
      .select('id,status,created_at,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('counterparty_name', model.loss.counterparty_name)
      .gte('created_at', partnerSince)
    : { data: [] };
  const partnerLosses = (partnerLossResult.data ?? []) as PartnerLossRow[];
  const partnerRecoveryResult = partnerLosses.length
    ? await client
      .from(TABLES.RECOVERY_CASES)
      .select('loss_case_id,status,eligible_loss_amount,amount_recovered,created_at,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .in('loss_case_id', partnerLosses.map((loss) => loss.id))
    : { data: [] };
  const partnerRecoveries = (partnerRecoveryResult.data ?? []) as PartnerRecoveryRow[];

  const amounts = model.amounts as LossAmount[];
  const mixedCurrency = amounts.length > 1;
  const amount = amounts.length === 1 ? amounts[0] : null;
  const currency = amount?.currency ?? model.loss.currency ?? null;
  const recoveries = (model.recoveries as RecoveryRow[]).map((recovery): NormalizedRecoveryRow => {
    const recoveredMinor = Math.round(Number(recovery.amount_recovered ?? 0) * 100);
    const soughtMinor = Math.max(
      recoveredMinor,
      Math.round(recoverySoughtAmount({
        merchant_loss_amount: Number(recovery.merchant_loss_amount ?? 0),
        eligible_loss_amount: recovery.eligible_loss_amount == null ? null : Number(recovery.eligible_loss_amount),
        estimated_recoverable_max: recovery.estimated_recoverable_max == null ? null : Number(recovery.estimated_recoverable_max),
        amount_recovered: recovery.amount_recovered == null ? null : Number(recovery.amount_recovered),
      }) * 100),
    );
    return {
      ...recovery,
      amount_sought_minor: soughtMinor,
      amount_approved_minor: ['approved', 'partially_approved', 'paid'].includes(recovery.status) ? soughtMinor : 0,
      amount_recovered_minor: recoveredMinor,
      amount_written_off_minor: recovery.status === 'closed_unrecoverable' ? Math.max(0, soughtMinor - recoveredMinor) : 0,
    };
  });
  const matchingRecoveries = currency ? recoveries.filter((recovery) => recovery.currency === currency) : recoveries;
  const sumKnown = (key: 'amount_sought_minor' | 'amount_approved_minor' | 'amount_recovered_minor') => matchingRecoveries.length
    ? matchingRecoveries.reduce((sum, row) => sum + (row[key] ?? 0), 0)
    : null;
  const claimedMinor = sumKnown('amount_sought_minor');
  const offeredMinor = sumKnown('amount_approved_minor');
  const recoveredMinor = sumKnown('amount_recovered_minor');
  const identifiedMinor = amount?.realisedLossMinor ?? amount?.estimatedLossMinor ?? null;
  const deadline = matchingRecoveries.map((recovery) => recovery.deadline_at).filter((value): value is string => Boolean(value)).sort()[0] ?? model.loss.claim_deadline_at ?? null;
  const deadlineDays = daysUntil(deadline);
  const owner = model.loss.counterparty_name ?? enumLabel('counterparty', model.loss.counterparty_type);
  const statusTone = REALISED_LOSS_STATUSES.has(model.loss.status) ? 'realised' : 'info';
  const reference = `CLM-${hashId(id).slice(1)}`;
  const caseReference = model.loss.support_payout_case_id ? `CASE-${hashId(model.loss.support_payout_case_id).slice(1)}` : 'case unavailable';
  const title = `${owner} ${enumLabel('lossCategory', model.loss.case_category).toLowerCase()} claim for ${caseReference}`;
  const activity = activityItems(model);
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

  const totalEligible = partnerRecoveries.reduce((sum, row) => sum + (typeof row.eligible_loss_amount === 'number' ? row.eligible_loss_amount : 0), 0);
  const totalRecovered = partnerRecoveries.reduce((sum, row) => sum + (typeof row.amount_recovered === 'number' ? row.amount_recovered : 0), 0);
  const settledByValue = totalEligible > 0 ? Math.round((totalRecovered / totalEligible) * 100) : null;
  const settled = partnerRecoveries.filter((row) => ['paid', 'approved', 'partially_approved'].includes(row.status));
  const settlementDurations = settled.map((row) => daysBetween(row.created_at, row.updated_at)).filter((value): value is number => value != null);
  const averageSettlementDays = settlementDurations.length ? Math.round(settlementDurations.reduce((sum, value) => sum + value, 0) / settlementDurations.length) : null;
  const rejectedCount = partnerRecoveries.filter((row) => row.status === 'rejected').length;

  const steps = [
    { label: 'Identified loss', value: identifiedMinor, meta: model.loss.confirmed_at ? `confirmed ${formatDateAbsolute(model.loss.confirmed_at)}` : 'recorded loss basis', tone: 'soft' },
    { label: 'Claimed from partner', value: claimedMinor, meta: matchingRecoveries.length ? `filed across ${matchingRecoveries.length} recovery ${matchingRecoveries.length === 1 ? 'record' : 'records'}` : 'no partner filing recorded', tone: 'blue' },
    { label: 'Offered by partner', value: offeredMinor, meta: offeredMinor ? 'partner-approved value' : 'no offer recorded yet', tone: 'neutral' },
    { label: 'Recovered to ledger', value: recoveredMinor, meta: recoveredMinor ? 'cash recovery recorded' : 'nothing credited yet', tone: 'green' },
  ];
  const barBasis = Math.max(identifiedMinor ?? 0, claimedMinor ?? 0, offeredMinor ?? 0, recoveredMinor ?? 0, 1);

  const evidence = model.evidence;
  const partnerHistory = [
    { label: 'Claims filed', value: model.loss.counterparty_name ? String(partnerLosses.length) : null, tone: 'default' },
    { label: 'Settled by value', value: settledByValue == null ? null : `${settledByValue}%`, tone: 'positive' },
    { label: 'Average days to settle', value: averageSettlementDays == null ? null : `${averageSettlementDays} days`, tone: 'default' },
    { label: 'Rejected recoveries', value: model.loss.counterparty_name ? String(rejectedCount) : null, tone: rejectedCount ? 'warning' : 'default' },
  ];

  return (
    <div className={styles.surface} data-surface-id="claim-detail" data-archetype="P7" data-state-id="claim-detail-challenge-6">
      <header className={styles.pageHeader}>
        <div>
          <p><Link href="/overview">Unauth</Link><ArrowRight size={9} /><span>Recovery board › {reference}</span></p>
          <h1>Claim</h1>
        </div>
        <nav aria-label="Claim record navigation">
          {previousId ? <HeaderLink href={`/financials/losses/${previousId}`}>Previous claim</HeaderLink> : null}
          {nextId ? <HeaderLink href={`/financials/losses/${nextId}`}>Next claim</HeaderLink> : null}
        </nav>
      </header>

      <section className={styles.claimHeader}>
        <div className={styles.claimIcon}><RefreshCw size={17} aria-hidden="true" /></div>
        <div className={styles.claimIdentity}>
          <div className={styles.identityTopline}>
            <code>{reference}</code>
            <span data-tone={statusTone}>{enumLabel('lossStatus', model.loss.status)}</span>
            {deadlineDays != null && deadlineDays >= 0 && deadlineDays <= 2 ? <span data-tone="warning">Response due {deadlineDays <= 1 ? '24h' : '48h'}</span> : null}
            {deadlineDays != null && deadlineDays < 0 ? <span data-tone="danger">Partner window closed</span> : null}
          </div>
          <h2>{title}</h2>
          <p>{`Filed ${formatDateAbsolute(model.loss.created_at)}`} · {claimedMinor == null || !currency ? 'Claimed value unavailable' : `${money(claimedMinor, currency)} claimed`} · {deadline ? `partner window closes ${formatDateAbsolute(deadline)}` : 'partner deadline unavailable'}</p>
        </div>
        <div className={styles.headerActions}>
          <LossActions lossId={id} canManage={canManage} writeOffAmountMinor={amount?.outstandingRecoveryMinor ?? null} currency={currency} writeOffState={writeOffState} compact />
          {primaryRecovery ? <HeaderLink href={`/financials/recovery/${primaryRecovery.id}?action=chase`}>Chase partner</HeaderLink> : null}
          {primaryRecovery ? <HeaderLink href={`/financials/recovery/${primaryRecovery.id}`} primary>Record partner response</HeaderLink> : null}
        </div>
      </section>

      <section className={styles.factStrip} aria-label="Claim facts">
        <div><span>Claimed</span><strong data-tone={claimedMinor == null || !currency ? 'unavailable' : undefined}>{claimedMinor == null || !currency ? <UnavailableValue reason="No verified claimed amount is recorded" /> : money(claimedMinor, currency)}</strong><small>{model.loss.support_payout_case_id ? `full loss on ${caseReference}` : 'case link unavailable'}</small></div>
        <div><span>Partner window</span><strong data-tone={deadlineDays == null ? 'unavailable' : deadlineDays <= 2 ? 'warning' : undefined}>{deadlineDays == null ? <UnavailableValue reason="No partner deadline is recorded" /> : deadlineDays < 0 ? 'Closed' : `${deadlineDays} ${deadlineDays === 1 ? 'day' : 'days'} left`}</strong><small>{deadline ? `closes ${formatDateAbsolute(deadline)}` : 'deadline not recorded'}</small></div>
        <div><span>Filed by</span><strong data-tone={model.loss.owner_user_id ? undefined : 'unavailable'}>{model.loss.owner_user_id ? 'Assigned operator' : <UnavailableValue reason="No operator is assigned to this loss" />}</strong><small>{formatDateTime(model.loss.created_at)}</small></div>
        <div><span>Expected recovery</span><strong data-tone={model.loss.estimated_recovery_minor == null || !currency ? 'unavailable' : 'positive'}>{model.loss.estimated_recovery_minor == null || !currency ? <UnavailableValue reason="Recovery basis has not been confirmed" /> : money(model.loss.estimated_recovery_minor, currency)}</strong><small>{model.loss.recoverability ? enumLabel('recoverability', model.loss.recoverability) : 'Recovery basis unavailable'}</small></div>
        <div><span>Realised if unpaid</span><strong data-tone={identifiedMinor == null || !currency ? 'unavailable' : undefined}>{identifiedMinor == null || !currency ? <UnavailableValue reason="No verified confirmed or estimated loss basis is recorded" /> : money(identifiedMinor, currency)}</strong><small>{deadline ? `window basis closes ${formatDateAbsolute(deadline)}` : 'conditional value unavailable'}</small></div>
      </section>

      <main className={styles.content}>
        <div className={styles.primaryColumn}>
          <section className={styles.card}>
            <h2>Amount progression</h2>
            <p className={styles.subtitle}>Every step is a recorded fact, not an estimate</p>
            <div className={styles.steps}>
              {steps.map((step) => {
                const unavailable = step.value == null || !currency;
                const percentage = step.value == null ? 0 : Math.max(12, Math.round((step.value / barBasis) * 100));
                return (
                  <div className={styles.step} key={step.label}>
                    <span><strong>{step.label}</strong><small>{step.meta}</small></span>
                    <div><i data-tone={unavailable ? 'unavailable' : step.tone} style={{ '--claim-step-width': `${percentage}%` } as CSSProperties}><b>{unavailable ? <UnavailableValue reason="No verified amount is recorded for this stage" /> : step.value === 0 ? 'Nothing yet' : money(step.value, currency)}</b></i></div>
                    <small>{step.value == null || identifiedMinor == null || identifiedMinor <= 0 ? 'basis unavailable' : step.value === 0 ? 'awaiting partner' : `${Math.round((step.value / identifiedMinor) * 100)}% of identified`}</small>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.card}>
            <h2>Correspondence and events</h2>
            {activity.length ? <ol className={styles.timeline}>
              {activity.slice(0, 10).map((event, index) => (
                <li key={event.id}>
                  <span><i data-tone={event.tone} />{index < Math.min(activity.length, 10) - 1 ? <b /> : null}</span>
                  <div><p><strong>{event.actor}</strong> {event.action}</p><time>{formatDateTime(event.at)}</time></div>
                </li>
              ))}
            </ol> : <p className={styles.emptyCopy}>No correspondence or events have been recorded.</p>}
          </section>
        </div>

        <aside className={styles.secondaryColumn}>
          <section className={styles.railCard}>
            <h2>Evidence submitted</h2>
            {evidence.length ? evidence.slice(0, 8).map((item) => (
              <div className={styles.evidenceRow} key={item.id}>
                <i><Check size={11} aria-hidden="true" /></i>
                <span><strong>{humaniseField(item.evidence_type)}</strong><small>{providerLabel(item.source_provider)} · {item.source_verified ? 'source verified' : 'verification unavailable'}</small></span>
              </div>
            )) : <p className={styles.emptyCopy}>No claim-specific evidence is linked. This does not mean evidence is complete.</p>}
          </section>

          <section className={styles.railCard}>
            <h2>Partner history</h2>
            <p className={styles.railSubtitle}>{owner} · trailing 90 days</p>
            <dl className={styles.partnerHistory}>
              {partnerHistory.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd data-tone={item.value == null ? 'unavailable' : item.tone}>
                    {item.value == null ? <UnavailableValue reason={`No ${item.label.toLowerCase()} value is recorded for this counterparty`} /> : item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={styles.railCard}>
            <h2>Linked records</h2>
            {model.loss.support_payout_case_id ? <Link className={styles.linkRow} href={`/cases/${model.loss.support_payout_case_id}`}>Open {caseReference}<ArrowRight size={11} /></Link> : <p className={styles.emptyCopy}>No support case is linked.</p>}
            {recoveries.map((recovery) => <Link className={styles.linkRow} key={recovery.id} href={`/financials/recovery/${recovery.id}`}>Recovery {hashId(recovery.id)}<ArrowRight size={11} /></Link>)}
          </section>
        </aside>
      </main>
    </div>
  );
}
