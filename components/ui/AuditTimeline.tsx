import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AuditTimelineItem = {
  id: string;
  label: string;
  actor?: ReactNode;
  source?: ReactNode;
  timestamp: ReactNode;
  detail?: ReactNode;
};

export function AuditTimeline({
  items,
  empty,
  className,
  'aria-label': ariaLabel = 'Activity',
}: {
  items: readonly AuditTimelineItem[];
  empty?: ReactNode;
  className?: string;
  'aria-label'?: string;
}) {
  if (items.length === 0) return <>{empty ?? null}</>;
  return (
    <ol className={cn('ua-audit-timeline', className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.id} className="ua-audit-timeline__item">
          <span className="ua-audit-timeline__marker" aria-hidden="true" />
          <div className="ua-audit-timeline__content">
            <div className="ua-audit-timeline__heading">
              <p>{item.label}</p>
              <time>{item.timestamp}</time>
            </div>
            {item.actor || item.source ? (
              <p className="ua-audit-timeline__meta">
                {item.actor ? <>Actor: {item.actor}</> : null}
                {item.actor && item.source ? <span aria-hidden="true"> · </span> : null}
                {item.source ? <>Source: {item.source}</> : null}
              </p>
            ) : null}
            {item.detail ? <div className="ua-audit-timeline__detail">{item.detail}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
