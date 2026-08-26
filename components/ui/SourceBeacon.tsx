import Link from '@/components/navigation/AppNavLink';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SourceBeaconState =
  | 'current'
  | 'stale'
  | 'partial'
  | 'disconnected'
  | 'unavailable';

export function SourceBeacon({
  provider,
  source,
  authority,
  observedAt,
  state = 'current',
  limitation,
  href,
  className,
}: {
  provider?: ReactNode;
  source: ReactNode;
  authority?: ReactNode;
  observedAt?: ReactNode;
  state?: SourceBeaconState;
  limitation?: ReactNode;
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      {provider ? <span className="ua-source-beacon__provider">{provider}</span> : null}
      <span className="ua-source-beacon__identity">
        <strong>{source}</strong>
        {authority ? <span>{authority}</span> : null}
      </span>
      <span className="ua-source-beacon__status" data-state={state}>
        <span className="ua-source-beacon__mark" aria-hidden="true" />
        {state}
      </span>
      {observedAt ? (
        <span className="ua-source-beacon__time">{observedAt}</span>
      ) : null}
      {limitation ? (
        <span className="ua-source-beacon__limitation">{limitation}</span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link className={cn('ua-source-beacon', 'ua-source-beacon--link', className)} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={cn('ua-source-beacon', className)}>{content}</div>;
}
