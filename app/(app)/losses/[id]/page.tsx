import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  hasPermission,
  PERMISSIONS,
} from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { DetailPageShell } from '@/components/workbench/DetailPageShell';
import { JoinedSection, OperationalState, StatusBadge, Surface } from '@/components/ui';
import { StageDotPlot, type StageDotPlotRow } from '@/components/charts/authenticated/operational/StageDotPlot';
import { getLossReadModel } from '@/lib/losses/readModel';
import { LossActions } from '@/components/losses/LossActions';
import { LossWaterfall, type LossWaterfallStep } from '@/components/losses/LossVisuals';
import { formatConfidencePercent, formatDateTime, formatMoneyOrDash } from '@/lib/utils/format';
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

const money = (
  minor: number | null | undefined,
  currency: string | null | undefined,
) => formatMoneyOrDash(minor, currency);

const humaniseField = (value: unknown) => typeof value === 'string' && value ? humanise(value) : '—';

function metadataString(value: unknown, key: string): string | null {
  if (typeof value !== 'object' || value === null || !(key in value)) return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' && candidate.trim() ? candidate : null;
}

function buildWaterfallSteps(loss: Record<string, unknown>, amount: LossAmount): { steps: LossWaterfallStep[]; reconciled: boolean } {
  const lossMinor = amount.realisedLossMinor ?? amount.estimatedLossMinor;
  const recoveredMinor = amount.recoveredMinor;
  if (lossMinor == null || recoveredMinor == null) {
    return {
      steps: [
        { key: 'loss', label: amount.realisedLossMinor != null ? 'Confirmed loss' : 'Estimated loss', valueMinor: lossMinor, direction: 'total' },
        { key: 'recovered', label: 'Recovered value', valueMinor: recoveredMinor, direction: 'subtract' },
        { key: 'net', label: 'Net unrecovered', valueMinor: null, direction: 'total' },
      ],
      reconciled: false,
    };
  }

  const gross = typeof loss.order_value_minor === 'number' ? loss.order_value_minor : null;
  const refund = typeof loss.refund_value_minor === 'number' ? loss.refund_value_minor : null;
  const chargeback = typeof loss.chargeback_value_minor === 'number' ? loss.chargeback_value_minor : null;
  const offsets = refund != null && chargeback != null ? refund + chargeback : null;
  const netUnrecovered = Math.max(0, lossMinor - recoveredMinor);
  const sourceFormulaNet = gross != null && offsets != null ? Math.max(0, gross - offsets - recoveredMinor) : null;
  const hasReconciledSourceFormula = sourceFormulaNet != null && sourceFormulaNet === netUnrecovered;

  if (hasReconciledSourceFormula) {
    return {
      steps: [
        { key: 'gross', label: 'Gross exposure', valueMinor: gross, direction: 'total' },
        { key: 'offsets', label: 'Refunds and offsets', valueMinor: offsets, direction: 'subtract' },
        { key: 'recovered', label: 'Recovered value', valueMinor: recoveredMinor, direction: 'subtract' },
        { key: 'net', label: 'Net unrecovered', valueMinor: sourceFormulaNet, direction: 'total' },
      ],
      reconciled: true,
    };
  }

  if (gross != null && offsets != null) {
    return {
      steps: [
        { key: 'gross', label: 'Gross exposure', valueMinor: gross, direction: 'total' },
        { key: 'offsets', label: 'Refunds and offsets', valueMinor: offsets, direction: 'subtract' },
        { key: 'recovered', label: 'Recovered value', valueMinor: recoveredMinor, direction: 'subtract' },
        { key: 'net', label: 'Net unrecovered', valueMinor: null, direction: 'total' },
      ],
      reconciled: false,
    };
  }

  // The canonical loss stage is a complete, auditable formula when order-level
  // offsets are not available. A present but mismatched source formula above
  // remains unavailable instead of hiding the reconciliation problem.
  return {
    steps: [
      { key: 'loss', label: amount.realisedLossMinor != null ? 'Confirmed loss' : 'Estimated loss', valueMinor: lossMinor, direction: 'total' },
      { key: 'recovered', label: 'Recovered value', valueMinor: recoveredMinor, direction: 'subtract' },
      { key: 'net', label: 'Net unrecovered', valueMinor: netUnrecovered, direction: 'total' },
    ],
    reconciled: true,
  };
}

function activityItems(model: Awaited<ReturnType<typeof getLossReadModel>>) {
  if (!model) return [];
  return [
    ...model.events.map((event) => ({
      id: `event:${event.id}`,
      at: event.created_at,
      label: humaniseField(event.event_type),
      detail: event.source_provider ? providerLabel(event.source_provider) : 'Loss record activity',
    })),
    ...model.correspondence.map((item) => ({
      id: `correspondence:${item.id}`,
      at: item.received_at ?? item.sent_at ?? item.created_at,
      label: `${humaniseField(item.direction)} correspondence`,
      detail: item.subject ?? providerLabel(item.source_provider),
    })),
    ...model.tasks.map((task) => ({
      id: `task:${task.id}`,
      at: task.updated_at,
      label: task.title,
      detail: `Task · ${humaniseField(task.status)}`,
    })),
  ].sort((left, right) => Date.parse(right.at) - Date.parse(left.at));
}

export default async function LossDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const client = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/dashboard');
  const model = await getLossReadModel(client, ctx.merchantId, id);
  if (!model) notFound();

  const canManage = await hasPermission(
    client,
    ctx,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
  );
  const primary = model.attributionCandidates.find((candidate) => candidate.is_primary) ?? null;
  const alternatives = model.attributionCandidates.filter((candidate) => !candidate.is_primary);
  const amounts = model.amounts as LossAmount[];
  const amount = amounts[0] ?? null;
  const waterfall = amount ? buildWaterfallSteps(model.loss as Record<string, unknown>, amount) : { steps: [], reconciled: false };
  const sourceLabel = metadataString(model.loss.source_metadata, 'source_label');
  const owner = model.loss.counterparty_name ?? enumLabel('counterparty', model.loss.counterparty_type);
  const title = `${enumLabel('lossCategory', model.loss.case_category)}${model.loss.counterparty_name ? ` · ${model.loss.counterparty_name}` : ''}`;
  const activity = activityItems(model);
  const writeOffState = model.loss.written_off_at || model.loss.status === 'closed_unrecoverable'
    ? 'already_written_off'
    : amounts.length > 1
      ? 'mixed_currency'
      : amount?.outstandingRecoveryMinor == null
        ? 'unavailable'
        : amount.outstandingRecoveryMinor <= 0
          ? 'no_outstanding'
          : 'available';
  const recoveryRows: StageDotPlotRow[] = [
    {
      key: 'recoverable',
      label: 'Recoverable',
      value: amount?.recoverableMinor ?? null,
      displayValue: money(amount?.recoverableMinor, amount?.currency),
      tone: 'primary',
    },
    {
      key: 'recovered',
      label: 'Recovered',
      value: amount?.recoveredMinor ?? null,
      displayValue: money(amount?.recoveredMinor, amount?.currency),
      tone: 'positive',
    },
    {
      key: 'outstanding',
      label: 'Outstanding',
      value: amount?.outstandingRecoveryMinor ?? null,
      displayValue: money(amount?.outstandingRecoveryMinor, amount?.currency),
      tone: 'neutral',
    },
  ];

  return (
    <DetailPageShell
      backHref="/losses"
      backLabel="Losses"
      title={title}
      subtitle={`${enumLabel('lossStatus', model.loss.status)} · ${enumLabel('sourceConfidence', model.loss.source_confidence)}`}
      statusBadge={<StatusBadge family="lossStatus" value={model.loss.status} size="sm" />}
      meta={[
        { label: 'Owner', value: owner },
        ...(sourceLabel ? [{ label: 'Source', value: sourceLabel }] : []),
        { label: 'Updated', value: formatDateTime(model.loss.updated_at) },
        { label: 'Reference', value: <span className="ua-text-metadata font-mono">{hashId(id)}</span> },
      ]}
      actions={
        <LossActions
          lossId={id}
          canManage={canManage}
          writeOffAmount={money(amount?.outstandingRecoveryMinor, amount?.currency)}
          writeOffState={writeOffState}
        />
      }
      tabs={
        <nav className="ua-text-label flex flex-wrap gap-3" aria-label="Loss detail sections">
          <a href="#loss-waterfall" className="text-[var(--ua-action-primary)]">Financial formula</a>
          <a href="#loss-attribution" className="text-[var(--ua-action-primary)]">Attribution</a>
          <a href="#loss-evidence" className="text-[var(--ua-action-primary)]">Evidence</a>
          <a href="#loss-activity" className="text-[var(--ua-action-primary)]">Activity</a>
        </nav>
      }
    >
      <div className="space-y-4">
        <LossWaterfall
          currency={amount?.currency ?? null}
          steps={waterfall.steps}
          reconciled={waterfall.reconciled}
        />

        <Surface structure="working" as="section" aria-label="Loss attribution and evidence spine">
          <JoinedSection id="loss-attribution" aria-labelledby="loss-attribution-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="loss-attribution-title" className="ua-text-section-title">Attribution</h2>
                <p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">The primary recovery owner is shown separately from candidate explanations.</p>
              </div>
              <span className="ua-text-dense font-medium text-[var(--ua-text-secondary)]">{amount?.currency ?? 'Currency unavailable'}</span>
            </div>
            <dl className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-3">
              <div>
                <dt className="ua-text-metadata">Primary attribution</dt>
                <dd className="ua-text-dense mt-1 font-medium">
                  {primary ? enumLabel('attribution', primary.attribution) : enumLabel('attribution', model.loss.attribution)}
                </dd>
              </div>
              <div>
                <dt className="ua-text-metadata">Accountable party</dt>
                <dd className="ua-text-dense mt-1 font-medium">{primary?.accountable_party_name ?? enumLabel('counterparty', primary?.accountable_party_type ?? model.loss.counterparty_type)}</dd>
              </div>
              <div>
                <dt className="ua-text-metadata">Confidence</dt>
                <dd className="ua-text-dense mt-1 font-medium">
                  {primary?.confidence == null ? enumLabel('sourceConfidence', model.loss.source_confidence) : formatConfidencePercent(primary.confidence)}
                </dd>
              </div>
            </dl>
            {alternatives.length ? (
              <div className="mt-4 border-t border-[var(--ua-border-subtle)] pt-3">
                <h3 className="ua-text-working-title text-[var(--ua-text-secondary)]">Candidate explanations</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {alternatives.map((candidate) => (
                    <li key={candidate.id} className="ua-text-dense text-[var(--ua-text-secondary)]">
                      {enumLabel('attribution', candidate.attribution)} · {candidate.accountable_party_name ?? enumLabel('counterparty', candidate.accountable_party_type)}
                      <span className="ua-text-metadata ml-1">(candidate only)</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </JoinedSection>

          <JoinedSection aria-labelledby="loss-recovery-title">
            <div>
              <h2 id="loss-recovery-title" className="ua-text-section-title">Recovery progress</h2>
              <p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">Only reconciled recovery stages are plotted; missing stages stay unavailable.</p>
            </div>
            <div className="mt-4">
              <StageDotPlot rows={recoveryRows} />
            </div>
          </JoinedSection>

          <JoinedSection aria-labelledby="loss-linked-title">
            <h2 id="loss-linked-title" className="ua-text-section-title">Linked records</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {model.loss.support_payout_case_id ? (
                <Link href={`/claims/${model.loss.support_payout_case_id}`} className="ua-text-dense rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 py-2 font-medium text-[var(--ua-text-secondary)] hover:bg-[var(--ua-surface-hover)]">
                  Open case
                </Link>
              ) : null}
              {model.recoveries.map((recovery) => (
                <Link key={recovery.id} href={`/recoveries/${recovery.id}`} className="ua-text-dense rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 py-2 font-medium text-[var(--ua-text-secondary)] hover:bg-[var(--ua-surface-hover)]">
                  Recovery {hashId(recovery.id)}
                </Link>
              ))}
              {!model.loss.support_payout_case_id && !model.recoveries.length ? <OperationalState kind="empty" title="No linked records" description="This loss is not currently joined to a case or recovery record." /> : null}
            </div>
          </JoinedSection>

          <JoinedSection id="loss-evidence" aria-labelledby="loss-evidence-title">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 id="loss-evidence-title" className="ua-text-section-title">Supporting evidence</h2>
                <p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">Source facts remain labelled with their provider and verification state.</p>
              </div>
              <span className="ua-text-metadata">{model.evidence.length} linked {model.evidence.length === 1 ? 'item' : 'items'}</span>
            </div>
            {model.evidence.length ? (
              <ul className="mt-4 divide-y divide-[var(--ua-border-subtle)]">
                {model.evidence.map((item) => (
                  <li key={item.id} className="ua-text-dense flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{humaniseField(item.evidence_type)}</p>
                      <p className="ua-text-caption-role mt-1">
                        {providerLabel(item.source_provider)} · {item.source_verified ? 'Source verified' : 'Not source verified'}
                      </p>
                    </div>
                    {item.source_url ? <a href={item.source_url} className="ua-text-working-title shrink-0 text-[var(--ua-action-primary)] underline underline-offset-2">Open source</a> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4"><OperationalState kind="empty" title="No loss-specific evidence linked" description="This does not mean evidence is complete; the ledger has no linked evidence item for this record." /></div>
            )}
          </JoinedSection>

          <JoinedSection id="loss-activity" aria-labelledby="loss-activity-title">
            <h2 id="loss-activity-title" className="ua-text-section-title">Activity</h2>
            {activity.length ? (
              <ol className="mt-4 divide-y divide-[var(--ua-border-subtle)]">
                {activity.map((item) => (
                  <li key={item.id} className="ua-text-dense flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <div>
                      <span className="font-medium">{item.label}</span>
                      <span className="ml-2 text-[var(--ua-text-secondary)]">{item.detail}</span>
                    </div>
                    <time className="ua-text-metadata shrink-0">{formatDateTime(item.at)}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-4"><OperationalState kind="empty" title="No loss activity recorded" description="Evidence, correspondence, task, and lifecycle activity will appear here when recorded." /></div>
            )}
          </JoinedSection>
        </Surface>
      </div>
    </DetailPageShell>
  );
}
