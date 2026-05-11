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
    case 'under_review': return { background: 'var(--info-bg,#EEF3FE)', color: 'var(--info,#2563EB)', border: '1px solid var(--info-bd,#B6CCFB)' };
    case 'contacted':    return { background: 'var(--risk-high-bg)', color: 'var(--risk-high)', border: '1px solid var(--risk-high-bd)' };
    case 'resolved':     return { background: 'var(--success-bg,#E8F1E6)', color: 'var(--success,#2F6B43)', border: '1px solid var(--success-bd,#B5D2A8)' };
    case 'cleared':      return { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' };
    default:             return { background: 'var(--bg-subtle)', color: 'var(--text-subtle)', border: '1px solid var(--border-subtle)' };
  }
}
