import { type ReactNode } from 'react';
import { Card } from './Card';

export function RecommendationBlock({ title = 'Next step', currentState, nextAction, summary, action }: { title?: string; currentState?: ReactNode; nextAction?: ReactNode; summary?: ReactNode; action?: ReactNode }) {
  return (
    <Card variant="panel" density="compact" className="space-y-3">
      <p className="ua-text-label text-[var(--uo-route-text-primary)]">{title}</p>
      {summary ? <p className="ua-text-body text-[var(--uo-route-text-secondary)]">{summary}</p> : null}
      {currentState || nextAction ? <dl className="grid gap-2 sm:grid-cols-2">{currentState ? <div><dt className="ua-text-metadata">Current state</dt><dd className="ua-text-working-title mt-0.5 text-[var(--uo-route-text-primary)]">{currentState}</dd></div> : null}{nextAction ? <div><dt className="ua-text-metadata">Next action</dt><dd className="ua-text-working-title mt-0.5 text-[var(--uo-route-text-primary)]">{nextAction}</dd></div> : null}</dl> : null}
      {action ? <div>{action}</div> : null}
    </Card>
  );
}
