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
    <span className={cn('ua-authority-stamp', className)} data-authority={authority}>
      <span className="ua-authority-stamp__label">
        <Icon size={11} strokeWidth={1.8} aria-hidden="true" />
        {label}
      </span>
      {machineRef ? <span className="ua-authority-stamp__ref">{machineRef}</span> : null}
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
              <span className="ua-evidence-thread__authority">
                <AuthorityStamp authority={item.authority} />
                <span className="ua-evidence-thread__label">{item.label}</span>
              </span>
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
            data-authority={item.authority}
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
      className={cn('ua-decision-bracket', className)}
      data-continuity={hasUnavailableLink ? 'partial' : 'known'}
      aria-label={title}
    >
      <header className="ua-decision-bracket__header">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      <EvidenceSpine items={items} label={`${title} stages`} compact />
    </section>
  );
}

/** @deprecated Use EvidenceSpine for new authenticated operating surfaces. */
export const EvidenceThread = EvidenceSpine;
