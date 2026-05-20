import { type ReactNode } from 'react';

interface WorkbenchEmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function WorkbenchEmptyState({ title, description, action }: WorkbenchEmptyStateProps) {
  return (
    <div className="px-4 py-8">
      <p className="flex items-center gap-2 text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        {title}
      </p>
      <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
