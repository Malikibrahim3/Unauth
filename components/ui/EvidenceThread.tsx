import Link from '@/components/navigation/AppNavLink';
import type { ReactNode } from 'react';
import {
  Database,
  ExternalLink,
  FileCheck2,
  GitBranch,
  Landmark,
  Lightbulb,
  Scale,
  UserRoundCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type EvidenceAuthority =
  | 'source'
  | 'fact'
  | 'human-finding'
  | 'inference'
  | 'recommendation'
  | 'decision'
  | 'merchant-decision'
  | 'external-action'
  | 'outcome'
  | 'ledger-outcome';

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

const AUTHORITY_META = {
  source: { label: 'Source', icon: Database },
  fact: { label: 'Fact', icon: FileCheck2 },
  'human-finding': { label: 'Human finding', icon: UserRoundCheck },
  inference: { label: 'Inference', icon: GitBranch },
  recommendation: { label: 'Recommendation', icon: Lightbulb },
  decision: { label: 'Merchant decision', icon: Scale },
  'merchant-decision': { label: 'Merchant decision', icon: Scale },
  'external-action': { label: 'External action', icon: ExternalLink },
  outcome: { label: 'Ledger outcome', icon: Landmark },
  'ledger-outcome': { label: 'Ledger outcome', icon: Landmark },
} as const satisfies Record<EvidenceAuthority, { label: string; icon: typeof Database }>;

/** Inline authority marker. It qualifies the adjacent object and never acts as a detached legend. */
export function AuthorityStamp({
  authority,
  machineRef,
  className,
}: {
  authority: EvidenceAuthority;
  machineRef?: ReactNode;
  className?: string;
}) {
  const { label, icon: Icon } = AUTHORITY_META[authority];
  return (
    <span className={cn('inline-flex items-center gap-2', className)} data-authority={authority}>
      <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[.06em] text-[#64686d]">
        <Icon size={11} strokeWidth={1.8} aria-hidden="true" />
        {label}
      </span>
      {machineRef ? <span className="font-mono text-[9.5px] text-[#6f6a63]">{machineRef}</span> : null}
    </span>
  );
}

export function EvidenceSpine({
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
      className={cn('relative m-0 flex list-none flex-col', compact ? 'gap-1.5' : 'gap-3', className)}
      aria-label={label}
    >
      {items.map((item) => {
        const body = (
          <>
            <span className="relative" aria-hidden="true">
              <span
                className="relative z-10 block h-2.5 w-2.5 rounded-full bg-[#1c1f23] ring-4 ring-white"
                data-authority={item.authority}
                data-state={item.state ?? 'known'}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <AuthorityStamp authority={item.authority} />
                <span className="text-[11px] leading-[1.45] text-[#64686d]">{item.label}</span>
              </span>
              <span className="font-semibold tabular-nums text-[#1c1f23]">{item.value}</span>
            </span>
            {item.meta ? (
              <span className="text-[11px] leading-[1.45] text-[#64686d]">{item.meta}</span>
            ) : null}
          </>
        );

        return (
          <li
            key={item.key}
            className="relative grid grid-cols-[14px_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-[#e4e3e0] bg-white p-3 before:absolute before:bottom-full before:left-[18px] before:h-3 before:w-px before:bg-[#d8d4cf] first:before:hidden"
            data-state={item.state ?? 'known'}
            data-authority={item.authority}
          >
            {item.href ? (
              <Link className="text-[#9f4f08] no-underline" href={item.href}>
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

/**
 * Evidence-to-decision continuity for surfaces that carry a real decision.
 * The ordered list is also the text alternative; missing links remain written
 * and open rather than being rendered as completed continuity.
 */
export function DecisionBracket({
  title = 'Decision trace',
  description,
  items,
  className,
}: {
  title?: string;
  description?: ReactNode;
  items: EvidenceThreadItem[];
  className?: string;
}) {
  const hasUnavailableLink = items.some((item) => ['missing', 'partial', 'stale'].includes(item.state ?? 'known'));
  return (
    <section
      className={cn('rounded-xl border border-[#e4e3e0] bg-white p-4', className)}
      data-continuity={hasUnavailableLink ? 'partial' : 'known'}
      aria-label={title}
    >
      <header className="flex items-center gap-3">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      <EvidenceSpine items={items} label={`${title} stages`} compact />
    </section>
  );
}

/** @deprecated Use EvidenceSpine for new authenticated operating surfaces. */
export const EvidenceThread = EvidenceSpine;
