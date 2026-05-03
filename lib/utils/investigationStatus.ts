export type InvestigationStatus = 'new' | 'under_review' | 'contacted' | 'resolved' | 'cleared';

export const STATUS_LABELS: Record<InvestigationStatus, string> = {
  new:          'New',
  under_review: 'Under review',
  contacted:    'Contacted',
  resolved:     'Resolved',
  cleared:      'Cleared',
};

export const STATUS_OPTIONS: InvestigationStatus[] = [
  'new', 'under_review', 'contacted', 'resolved', 'cleared',
];

export function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'under_review': return { background: 'var(--info-bg,#eff6ff)', color: 'var(--info,#2563eb)', border: '1px solid var(--info-bd,#bfdbfe)' };
    case 'contacted':    return { background: 'var(--risk-high-bg)', color: 'var(--risk-high)', border: '1px solid var(--risk-high-bd)' };
    case 'resolved':     return { background: 'var(--success-bg,#f0fdf4)', color: 'var(--success,#16a34a)', border: '1px solid var(--success-bd,#bbf7d0)' };
    case 'cleared':      return { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' };
    default:             return { background: 'var(--bg-subtle)', color: 'var(--text-subtle)', border: '1px solid var(--border-subtle)' };
  }
}
