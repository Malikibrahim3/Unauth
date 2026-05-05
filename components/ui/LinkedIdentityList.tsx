import { cn } from '@/lib/utils';
import { ConfidenceBadge, type ConfidenceGradeValue } from './ConfidenceBadge';
import { SignalBadge, type SignalType } from './SignalBadge';

interface LinkedIdentityItem {
  id: string;
  name: string | null;
  email?: string;
  phone?: string;
  address?: string;
  confidence: { grade: ConfidenceGradeValue; score: number };
  linkedBy: SignalType[];
}

interface LinkedIdentityListProps {
  identities: LinkedIdentityItem[];
  onViewClick?: (id: string) => void;
  onRowExpand?: (id: string) => void;
  expandedId?: string;
  className?: string;
}

function Avatar({ name }: { name: string | null }) {
  const initials = name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0] ?? '')
        .join('')
        .toUpperCase()
    : '?';
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-semibold"
      style={{ background: 'var(--bg-surface-sunk)', color: 'var(--text-secondary)' }}
    >
      {initials}
    </div>
  );
}

export function LinkedIdentityList({
  identities,
  onViewClick,
  onRowExpand,
  expandedId,
  className,
}: LinkedIdentityListProps) {
  return (
    <ul className={cn('divide-y divide-[var(--border-subtle)]', className)}>
      {identities.map((identity) => {
        const expanded = expandedId === identity.id;
        return (
          <li key={identity.id}>
            <div
              className="flex items-start gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-4)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              onClick={() => onRowExpand?.(identity.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowExpand?.(identity.id); } }}
              aria-expanded={expanded}
            >
              <Avatar name={identity.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-[var(--space-2)]">
                  <span className="text-body-strong text-[var(--text-primary)] truncate">
                    {identity.name ?? <em className="text-[var(--text-tertiary)]">Unknown</em>}
                  </span>
                  <ConfidenceBadge grade={identity.confidence.grade} score={identity.confidence.score} size="sm" />
                </div>
                <div className="mt-[var(--space-1)] text-small text-[var(--text-secondary)] flex flex-wrap gap-x-[var(--space-3)] gap-y-1">
                  {identity.email && <span className="truncate">{identity.email}</span>}
                  {identity.phone && <span>{identity.phone}</span>}
                  {identity.address && <span className="truncate">{identity.address}</span>}
                </div>
                {identity.linkedBy.length > 0 && (
                  <div className="mt-[var(--space-2)] flex flex-wrap gap-[var(--space-1)]">
                    {identity.linkedBy.slice(0, 3).map((sig) => (
                      <SignalBadge key={sig} signal={sig} size="sm" />
                    ))}
                    {identity.linkedBy.length > 3 && (
                      <span className="text-meta text-[var(--text-tertiary)]">+{identity.linkedBy.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Expanded detail */}
            {expanded && onViewClick && (
              <div className="px-[var(--space-5)] pb-[var(--space-4)] bg-[var(--bg-surface-alt)]">
                <button
                  onClick={() => onViewClick(identity.id)}
                  className="text-small text-[var(--text-link)] hover:underline"
                >
                  View full profile →
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
