import { MetricGroup, OperationalState, UnavailableValue } from '@/components/ui';
import type { MetricGroupItem } from '@/components/ui';
import type { ClaimQueueCounts } from '@/lib/claims/queueCounts';
import type { CasesSummary } from './claimsPageLogic';
import type { CasesFlowSnapshot } from './casesFlow';

type Props = {
  counts: ClaimQueueCounts;
  summary: CasesSummary;
  flow: CasesFlowSnapshot | null;
};

function formatDays(value: number | null): string {
  if (value === null) return '—';
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}d`;
}

export function CasesMetrics({ counts, summary, flow }: Props) {
  const items: MetricGroupItem[] = [
    {
      label: 'Open cases',
      value: summary.active.label,
      description: `${counts.awaitingEvidence} evidence · ${counts.readyForDecision} decision · ${counts.manualReview} review`,
    },
    {
      label: 'Awaiting decision',
      value: summary.readyForDecision.label,
      description: `evidence complete on ${Math.max(0, counts.readyForDecision - counts.manualReview)} observed`,
    },
    {
      label: 'Median age',
      value: flow ? formatDays(flow.medianOpenAgeDays) : <UnavailableValue reason="Case timeline unavailable" />,
      description: flow ? 'across the active queue' : 'Case timeline unavailable',
    },
    {
      label: 'Closed within SLA',
      value: flow?.closedWithinSlaPercent != null ? `${flow.closedWithinSlaPercent}%` : <UnavailableValue reason="No verified close interval" />,
      description: flow?.closedWithinSlaPercent != null ? 'within the 7-day operating target' : 'No verified close interval',
    },
  ];
  return <MetricGroup aria-label="Cases overview" items={items} variant="divided" columns={4} />;
}

export function CasesFlow({ counts, flow }: Pick<Props, 'counts' | 'flow'>) {
  const maxBacklog = Math.max(1, ...(flow?.daily.map((day) => day.backlog) ?? [1]));
  const maxDailyMovement = Math.max(1, ...(flow?.daily.flatMap((day) => [day.opened, day.closed]) ?? [1]));
  const backlogPoints = flow?.daily.map((day, index) => {
    const x = flow.daily.length === 1 ? 0 : (index / (flow.daily.length - 1)) * 600;
    const y = 170 - (day.backlog / maxBacklog) * 154;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <section className="ua-cases-flow" aria-labelledby="cases-flow-title">
      <div className="ua-cases-flow__chart">
        <header>
          <div>
            <h2 id="cases-flow-title">Case flow</h2>
            <p>Open backlog against cases opened and closed each day</p>
          </div>
          <div className="ua-cases-flow__legend" aria-label="Case flow legend"><span><i data-tone="backlog" />Open backlog</span><span><i data-tone="opened" />Opened</span><span><i data-tone="closed" />Closed</span></div>
        </header>
        {flow ? (
          <div className="ua-cases-flow__plot" role="img" aria-label={`Thirty-day case flow: ${flow.opened30d} opened, ${flow.closed30d} closed, net change ${flow.netChange}.`}>
            <span data-axis="top">{maxBacklog}</span>
            <span data-axis="bottom">0</span>
            <svg className="ua-cases-flow__backlog" viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={backlogPoints} />
            </svg>
            <div className="ua-cases-flow__movements" aria-hidden="true">
              {flow.daily.map((day) => (
                <span className="ua-cases-flow__day" key={day.date}>
                  <i data-tone="opened" style={{ height: `${Math.max(2, (day.opened / maxDailyMovement) * 52)}%` }} />
                  <i data-tone="closed" style={{ height: `${Math.max(2, (day.closed / maxDailyMovement) * 52)}%` }} />
                </span>
              ))}
            </div>
            <div className="ua-cases-flow__periods"><span>{flow.daily[0]?.label}</span><span>{flow.daily[14]?.label}</span><span>{flow.daily.at(-1)?.label}</span></div>
          </div>
        ) : (
          <OperationalState
            kind="unavailable"
            placement="plot"
            title="Daily flow unavailable"
            description="The case timeline could not be read."
            minHeight={205}
          />
        )}
      </div>
      <dl className="ua-cases-flow__stats">
        <div><dt>Opened, 30 days</dt><dd>{flow ? flow.opened30d : <UnavailableValue reason="Interval unavailable" />}<small>{flow ? 'new cases' : 'interval unavailable'}</small></dd></div>
        <div><dt>Closed, 30 days</dt><dd>{flow ? flow.closed30d : <UnavailableValue reason="Timeline unavailable" />}<small>{counts.closed} recorded overall</small></dd></div>
        <div><dt>Net change</dt><dd>{flow ? `${flow.netChange > 0 ? '+' : ''}${flow.netChange}` : <UnavailableValue reason="Timeline unavailable" />}<small>{flow ? 'opened minus closed' : 'timeline unavailable'}</small></dd></div>
        <div><dt>Median time to close</dt><dd>{flow ? formatDays(flow.medianTimeToCloseDays) : <UnavailableValue reason="Close interval unavailable" />}<small>{flow ? 'verified outcome interval' : 'close interval unavailable'}</small></dd></div>
      </dl>
    </section>
  );
}
