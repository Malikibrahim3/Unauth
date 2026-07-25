import { type ReactNode } from 'react';
import { Card } from './Card';

export function RecommendationBlock({ title = 'Next step', currentState, nextAction, summary, action }: { title?: string; currentState?: ReactNode; nextAction?: ReactNode; summary?: ReactNode; action?: ReactNode }) {
  return (
    <Card variant="panel" density="compact" className="space-y-3">
      <p className="text-xs font-semibold text-[var(--ua-text-primary)]">{title}</p>
      {summary ? <p className="text-sm text-[var(--ua-text-secondary)]">{summary}</p> : null}
      {currentState || nextAction ? <dl className="grid gap-2 sm:grid-cols-2">{currentState ? <div><dt className="text-xs text-[var(--ua-text-tertiary)]">Current state</dt><dd className="mt-0.5 text-sm font-medium text-[var(--ua-text-primary)]">{currentState}</dd></div> : null}{nextAction ? <div><dt className="text-xs text-[var(--ua-text-tertiary)]">Next action</dt><dd className="mt-0.5 text-sm font-medium text-[var(--ua-text-primary)]">{nextAction}</dd></div> : null}</dl> : null}
      {action ? <div>{action}</div> : null}
    </Card>
  );
}
