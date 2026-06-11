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
    case 'under_review': return { background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-bd,var(--accent))' };
    case 'contacted':    return { background: 'var(--risk-high-bg)', color: 'var(--risk-high)', border: '1px solid var(--risk-high-bd)' };
    case 'resolved':     return { background: 'var(--success-bg,#E8F1E6)', color: 'var(--success,#2F6B43)', border: '1px solid var(--success-bd,#B5D2A8)' };
    case 'cleared':      return { background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' };
    default:             return { background: 'var(--bg-subtle)', color: 'var(--text-tertiary)', border: '1px solid var(--border-muted)' };
  }
}
