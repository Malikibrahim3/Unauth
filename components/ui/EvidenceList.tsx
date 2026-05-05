import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SignalBadge, type SignalType, type SignalStrength } from './SignalBadge';

interface EvidenceItem {
  id: string;
  signalType: SignalType;
  strength: SignalStrength;
  headline: string;
  detail: string;
  metadata?: { label: string; value: string }[];
  contradicts?: boolean;
  icon?: ReactNode;
}

interface EvidenceListProps {
  items: EvidenceItem[];
  onItemClick?: (id: string) => void;
  className?: string;
}

function StrengthBars({ strength }: { strength: SignalStrength }) {
  const filled = strength === 'weak' ? 1 : strength === 'moderate' ? 2 : 3;
  return (
    <span className="inline-flex items-end gap-px" aria-label={`Strength: ${strength}`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          style={{
            width: 3,
            height: n === 1 ? 6 : n === 2 ? 8 : 10,
            borderRadius: 1,
            background: 'currentColor',
            display: 'inline-block',
            opacity: n <= filled ? 1 : 0.25,
          }}
        />
      ))}
    </span>
  );
}

export function EvidenceList({ items, onItemClick, className }: EvidenceListProps) {
  return (
    <ul className={cn('divide-y divide-[var(--border-subtle)]', className)}>
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            'flex gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-4)]',
            'transition-colors',
            item.contradicts
              ? 'bg-[var(--info-bg)]'
              : 'hover:bg-[var(--bg-hover)]',
            onItemClick && 'cursor-pointer',
          )}
          onClick={onItemClick ? () => onItemClick(item.id) : undefined}
        >
          {/* Left: signal icon */}
          <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--bg-surface-alt)] flex items-center justify-center text-[var(--text-tertiary)]">
            {item.icon ?? <span className="w-2 h-2 rounded-full bg-current" />}
          </div>

          {/* Right content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-[var(--space-3)]">
              <p className="text-body-strong text-[var(--text-primary)]">{item.headline}</p>
              <StrengthBars strength={item.strength} />
            </div>
            <p className="mt-[var(--space-1)] text-small text-[var(--text-secondary)]">{item.detail}</p>
            {item.metadata && item.metadata.length > 0 && (
              <div className="mt-[var(--space-2)] flex flex-wrap gap-[var(--space-2)]">
                {item.metadata.map((m) => (
                  <span key={m.label} className="text-meta text-[var(--text-tertiary)]">
                    <span className="text-[var(--text-secondary)]">{m.label}</span>: {m.value}
                  </span>
                ))}
              </div>
            )}
            {item.contradicts && (
              <div className="mt-[var(--space-2)]">
                <SignalBadge signal={item.signalType} size="sm" />
                <span className="ml-[var(--space-2)] text-small text-[var(--info-fg)]">Counter-evidence</span>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
