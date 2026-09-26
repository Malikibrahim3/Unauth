import type { CSSProperties, ReactNode } from 'react';

export type OperationalStateKind = 'zero' | 'empty' | 'filtered-empty' | 'insufficient-history' | 'partial' | 'stale' | 'disconnected' | 'error' | 'mixed-currency' | 'unavailable' | 'refreshing' | 'not-configured' | 'permission' | 'permission-limited' | 'locked' | 'verified-zero';
export type StatePlacement = 'panel' | 'plot' | 'table' | 'page';

const DEFAULT_COPY: Record<OperationalStateKind, { title: string; description: string }> = {
  zero: { title: 'Nothing recorded yet', description: 'This workspace has no records in the selected scope.' },
  empty: { title: 'Nothing here yet', description: 'Records will appear here when the connected source sends them.' },
  'filtered-empty': { title: 'No records match these filters', description: 'Clear a filter or broaden the range to see more records.' },
  'insufficient-history': { title: 'Not enough history yet', description: 'This view needs more time in range before it can show a reliable comparison.' },
  partial: { title: 'Some data is unavailable', description: 'The available records are shown; refresh after the source catches up.' },
  stale: { title: 'Data may be out of date', description: 'The source has not reported recently. Review the last successful update.' },
  disconnected: { title: 'Source not connected', description: 'Connect a source to bring this workflow into the workspace.' },
  error: { title: 'Could not load this data', description: 'Try again. No business state was changed.' },
  'mixed-currency': { title: 'Mixed currencies in this scope', description: 'These values use more than one currency and cannot be summed. Review the per-currency split.' },
  unavailable: { title: 'Data unavailable', description: 'This source cannot provide the requested data right now.' },
  refreshing: { title: 'Refreshing…', description: 'The latest data is being fetched from the connected source.' },
  'not-configured': { title: 'Not configured', description: 'This source or workflow has never been connected.' },
  permission: { title: 'You do not have access', description: 'Ask a workspace owner for access to this information.' },
  'permission-limited': { title: 'Limited by your permissions', description: 'Some records in this scope are withheld by your role.' },
  locked: { title: 'This feature is not enabled', description: 'Contact your workspace owner to review availability.' },
  'verified-zero': { title: 'Verified zero', description: 'The query completed and confirmed there is nothing in this scope — this is not missing data.' },
};
const ALERT_KINDS: ReadonlySet<OperationalStateKind> = new Set(['error', 'mixed-currency']);

export interface OperationalStateProps { kind: OperationalStateKind; placement?: StatePlacement; title?: string; description?: string; action?: ReactNode; minHeight?: number; className?: string; }

export function OperationalState({ kind, placement = 'panel', title, description, action, minHeight, className: _className }: OperationalStateProps) {
  const copy = DEFAULT_COPY[kind];
  const style: CSSProperties = { minHeight, display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 6, padding: 24, border: '1px solid #e4e3e0', borderRadius: 12, background: '#fff', textAlign: 'center' };
  return <div role={ALERT_KINDS.has(kind) ? 'alert' : 'status'} data-kind={kind} data-state={kind} data-placement={placement} style={style}><p style={{ margin: 0, color: '#1c1f23', font: "500 13px/1.4 'Inter',sans-serif" }}>{title ?? copy.title}</p><p style={{ maxWidth: 520, margin: 0, color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>{description ?? copy.description}</p>{action ? <div style={{ marginTop: 6 }}>{action}</div> : null}</div>;
}
