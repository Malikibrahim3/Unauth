import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type EvidenceAuthority =
  | 'source'
  | 'fact'
  | 'inference'
  | 'recommendation'
  | 'decision'
  | 'outcome';

export type EvidenceThreadState =
  | 'known'
  | 'partial'
  | 'missing'
  | 'stale'
  | 'recorded';

export type EvidenceThreadItem = {
  key: string;
  authority: EvidenceAuthority;
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
  href?: string;
  state?: EvidenceThreadState;
};

export function EvidenceThread({
  items,
  label,
  compact = false,
  className,
}: {
  items: EvidenceThreadItem[];
  label: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <ol
      className={cn('ua-evidence-thread', compact && 'ua-evidence-thread--compact', className)}
      aria-label={label}
    >
      {items.map((item) => {
        const body = (
          <>
            <span className="ua-evidence-thread__rail" aria-hidden="true">
              <span
                className="ua-evidence-thread__node"
                data-authority={item.authority}
                data-state={item.state ?? 'known'}
              />
            </span>
            <span className="ua-evidence-thread__content">
              <span className="ua-evidence-thread__label">{item.label}</span>
              <span className="ua-evidence-thread__value">{item.value}</span>
            </span>
            {item.meta ? (
              <span className="ua-evidence-thread__meta">{item.meta}</span>
            ) : null}
          </>
        );

        return (
          <li
            key={item.key}
            className="ua-evidence-thread__item"
            data-state={item.state ?? 'known'}
          >
            {item.href ? (
              <Link className="ua-evidence-thread__link" href={item.href}>
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}
