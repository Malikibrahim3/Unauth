import { type ReactNode } from 'react';
import { Card } from './Card';

export function RecommendationBlock({ title = 'Next step', currentState, nextAction, summary, action }: { title?: string; currentState?: ReactNode; nextAction?: ReactNode; summary?: ReactNode; action?: ReactNode }) {
  return (
    <Card variant="panel" density="compact" className="space-y-3">
      <p className="text-[11px] font-medium leading-4 text-[#64686d] text-[#1c1f23]">{title}</p>
      {summary ? <p className="text-[13px] leading-5 text-[#40454a] text-[#64686d]">{summary}</p> : null}
      {currentState || nextAction ? <dl className="grid gap-2 sm:grid-cols-2">{currentState ? <div><dt className="text-[10.5px] leading-4 text-[#6f6a63]">Current state</dt><dd className="font-medium text-[13px] leading-5 text-[#1c1f23] mt-0.5 text-[#1c1f23]">{currentState}</dd></div> : null}{nextAction ? <div><dt className="text-[10.5px] leading-4 text-[#6f6a63]">Next action</dt><dd className="font-medium text-[13px] leading-5 text-[#1c1f23] mt-0.5 text-[#1c1f23]">{nextAction}</dd></div> : null}</dl> : null}
      {action ? <div>{action}</div> : null}
    </Card>
  );
}
