'use client';

import { useRouter } from 'next/navigation';
import { FileText, Hash, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FLAG_COMMAND_CENTER } from '@/lib/flags';
import type { ConfidenceGrade } from '@/lib/engine/weights';
import { GradeBadge, type ConfidenceGradeValue } from '@/components/ui/GradeBadge';
import type {
  CommandPaletteAction,
  CommandPaletteState,
  CustomerResult,
  NavItem,
} from '@/components/layout/commandPaletteReducer';

const COMMAND_GRADE_TO_LETTER: Record<ConfidenceGrade, ConfidenceGradeValue> = {
  definite: 'A',
  probable: 'B',
  possible: 'C',
  weak: 'D',
};

type CommandPaletteResultsListProps = {
  state: CommandPaletteState;
  filteredNav: NavItem[];
  searchRowIdx: number;
  customerStartIdx: number;
  navStartIdx: number;
  dispatch: React.Dispatch<CommandPaletteAction>;
  onClose: () => void;
  onSearchSubmit: () => void;
  onCustomerSelect: (customer: CustomerResult) => void;
  onNavSelect: (item: NavItem) => void;
};

export function CommandPaletteResultsList({
  state,
  filteredNav,
  searchRowIdx,
  customerStartIdx,
  navStartIdx,
  dispatch,
  onClose,
  onSearchSubmit,
  onCustomerSelect,
  onNavSelect,
}: CommandPaletteResultsListProps) {
  const router = useRouter();

  return (
    <div className="max-h-80 overflow-y-auto py-2">
      {state.query.trim() ? (
        <button
          type="button"
          className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors')}
          style={{ background: state.activeIdx === searchRowIdx ? 'var(--bg-subtle)' : 'transparent' }}
          onClick={onSearchSubmit}
          onMouseEnter={() => dispatch({ type: 'setActiveIdx', activeIdx: searchRowIdx })}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
            style={{ background: 'var(--bg-subtle)', color: 'var(--icon-muted)' }}
          >
            <Search size={14} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Search customers for &ldquo;{state.query}&rdquo;
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Browse all matching profiles</p>
          </div>
        </button>
      ) : null}

      {state.customerResults.length > 0 ? (
        <>
          <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Customers
          </p>
          {state.customerResults.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
              style={{ background: state.activeIdx === customerStartIdx + i ? 'var(--bg-subtle)' : 'transparent' }}
              onMouseEnter={() => dispatch({ type: 'setActiveIdx', activeIdx: customerStartIdx + i })}
              onClick={() => onCustomerSelect(c)}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full shrink-0 text-xs font-bold"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
              >
                {(c.name?.[0] ?? '?').toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{c.name}</p>
                {c.email ? <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{c.email}</p> : null}
              </div>
              <GradeBadge
                grade={COMMAND_GRADE_TO_LETTER[c.risk_level as ConfidenceGrade] ?? 'F'}
                size="sm"
                compact
              />
            </button>
          ))}
        </>
      ) : null}

      {FLAG_COMMAND_CENTER && state.unifiedResults.some((r) => r.type !== 'customer') ? (
        <>
          {(['order', 'evidence'] as const).map((type) => {
            const group = state.unifiedResults.filter((r) => r.type === type);
            if (!group.length) return null;
            const groupLabel = type === 'order' ? 'Orders' : 'Evidence packages';
            const baseIdx =
              customerStartIdx +
              state.customerResults.length +
              state.unifiedResults.filter((r) => r.type !== 'customer').indexOf(group[0]);
            return (
              <div key={type}>
                <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  {groupLabel}
                </p>
                {group.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
                    style={{ background: state.activeIdx === baseIdx + i ? 'var(--bg-subtle)' : 'transparent' }}
                    onMouseEnter={() => dispatch({ type: 'setActiveIdx', activeIdx: baseIdx + i })}
                    onClick={() => {
                      onClose();
                      router.push(item.href);
                    }}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 text-xs"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--icon-muted)' }}
                    >
                      {type === 'order' ? <Hash size={13} aria-hidden="true" /> : <FileText size={13} aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.label}</p>
                      {item.sublabel ? <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.sublabel}</p> : null}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </>
      ) : null}

      {filteredNav.length > 0 || !state.query.trim() ? (
        <>
          {state.customerResults.length > 0 || state.query.trim() ? (
            <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Navigate
            </p>
          ) : null}
          {filteredNav.map((item, i) => (
            <button
              key={item.href}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ background: state.activeIdx === navStartIdx + i ? 'var(--bg-subtle)' : 'transparent' }}
              onMouseEnter={() => dispatch({ type: 'setActiveIdx', activeIdx: navStartIdx + i })}
              onClick={() => onNavSelect(item)}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                style={{ background: 'var(--bg-subtle)', color: 'var(--icon-muted)' }}
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
              </div>
            </button>
          ))}
        </>
      ) : null}

      {filteredNav.length === 0 && state.customerResults.length === 0 && state.query.trim() && !state.searchingCustomers ? (
        <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          No results for &ldquo;{state.query}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
