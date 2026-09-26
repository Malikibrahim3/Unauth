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
    <ol className={cn('text-[11px] leading-[1.45] text-[#64686d]', className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.id} className="text-[11px] leading-[1.45] text-[#64686d]">
          <span className="text-[11px] leading-[1.45] text-[#64686d]" aria-hidden="true" />
          <div className="text-[11px] leading-[1.45] text-[#64686d]">
            <div className="font-semibold text-[#1c1f23]">
              <p>{item.label}</p>
              <time>{item.timestamp}</time>
            </div>
            {item.actor || item.source ? (
              <p className="text-[11px] leading-[1.45] text-[#64686d]">
                {item.actor ? <>Actor: {item.actor}</> : null}
                {item.actor && item.source ? <span aria-hidden="true"> · </span> : null}
                {item.source ? <>Source: {item.source}</> : null}
              </p>
            ) : null}
            {item.detail ? <div className="text-[11px] leading-[1.45] text-[#64686d]">{item.detail}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
