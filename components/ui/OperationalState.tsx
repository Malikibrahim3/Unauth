import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type OperationalStateKind =
  | 'zero'
  | 'empty'
  | 'filtered-empty'
  | 'partial'
  | 'stale'
  | 'disconnected'
  | 'unavailable'
  | 'permission'
  | 'locked'
  | 'error';

const DEFAULT_COPY: Record<OperationalStateKind, { title: string; description: string }> = {
  zero: { title: 'Nothing recorded yet', description: 'This workspace has no records in the selected scope.' },
  empty: { title: 'Nothing here yet', description: 'Records will appear here when the connected source sends them.' },
  'filtered-empty': { title: 'No records match these filters', description: 'Clear a filter or broaden the range to see more records.' },
  partial: { title: 'Some data is unavailable', description: 'The available records are shown; refresh after the source catches up.' },
  stale: { title: 'Data may be out of date', description: 'The source has not reported recently. Review the last successful update.' },
  disconnected: { title: 'Source not connected', description: 'Connect a source to bring this workflow into the workspace.' },
  unavailable: { title: 'Data unavailable', description: 'This source cannot provide the requested data right now.' },
  permission: { title: 'You do not have access', description: 'Ask a workspace owner for access to this information.' },
  locked: { title: 'This feature is not enabled', description: 'Contact your workspace owner to review availability.' },
  error: { title: 'Could not load this data', description: 'Try again. No business state was changed.' },
};

export interface OperationalStateProps {
  kind: OperationalStateKind;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Geometry-aware state copy shared by tables, boards, and detail sections. */
export function OperationalState({ kind, title, description, action, className }: OperationalStateProps) {
  const copy = DEFAULT_COPY[kind];
  const isAlert = kind === 'error' || kind === 'unavailable';
  return (
    <div
      className={cn('ua-operational-state', `ua-operational-state--${kind}`, className)}
      role={isAlert ? 'alert' : 'status'}
      data-state={kind}
    >
      <p className="ua-operational-state__title">{title ?? copy.title}</p>
      <p className="ua-operational-state__description">{description ?? copy.description}</p>
      {action ? <div className="ua-operational-state__action">{action}</div> : null}
    </div>
  );
}
