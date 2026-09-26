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
      {provider ? <span className="shrink-0">{provider}</span> : null}
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[11px] font-medium text-[#1c1f23]">{source}</strong>
        {authority ? <span className="block text-[9.5px] text-[#6f6a63]">{authority}</span> : null}
      </span>
      <span className="inline-flex items-center rounded-md bg-[#f4f3f1] px-2 py-1 text-[10px] font-semibold text-[#40454a]" data-state={state}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        {state}
      </span>
      {observedAt ? (
        <span className="text-[11px] leading-[1.45] text-[#64686d]">{observedAt}</span>
      ) : null}
      {limitation ? (
        <span className="basis-full text-[10px] text-[#6f6a63]">{limitation}</span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link className={cn('flex flex-wrap items-center gap-2 rounded-lg border border-[#e4e3e0] bg-white p-3 text-[#9f4f08] no-underline', className)} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={cn('flex flex-wrap items-center gap-2 rounded-lg border border-[#e4e3e0] bg-white p-3', className)}>{content}</div>;
}
