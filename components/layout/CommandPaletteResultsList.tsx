'use client';

import { useRouter } from 'next/navigation';
import { FileText, Hash, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CommandPaletteAction,
  CommandPaletteState,
  CustomerResult,
  NavItem,
} from '@/components/layout/commandPaletteReducer';

// Order MUST match the push order in app/api/search/route.ts so the flat
// keyboard index model stays aligned across all groups.
const UNIFIED_GROUPS = [
  { type: 'order', label: 'Orders' },
  { type: 'case', label: 'Cases' },
  { type: 'ticket', label: 'Tickets' },
  { type: 'shipment', label: 'Shipments' },
  { type: 'refund', label: 'Refunds' },
  { type: 'return', label: 'Returns' },
  { type: 'dispute', label: 'Disputes' },
  { type: 'loss', label: 'Losses' },
  { type: 'recovery', label: 'Recoveries' },
] as const;

type CommandPaletteResultsListProps = {
  state: CommandPaletteState;
  filteredNav: NavItem[];
  searchRowIdx: number;
  customerStartIdx: number;
  unifiedStartIdx: number;
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
  unifiedStartIdx,
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
          style={{ background: state.activeIdx === searchRowIdx ? 'var(--ua-surface-secondary)' : 'transparent' }}
          onClick={onSearchSubmit}
          onMouseEnter={() => dispatch({ type: 'setActiveIdx', activeIdx: searchRowIdx })}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
            style={{ background: 'var(--ua-surface-secondary)', color: 'var(--ua-icon-secondary)' }}
          >
            <Search size={14} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>
              Search customers for &ldquo;{state.query}&rdquo;
            </p>
            <p className="ua-text-caption-role" style={{ color: 'var(--ua-text-secondary)' }}>Browse all matching profiles</p>
          </div>
        </button>
      ) : null}

      {state.customerResults.length > 0 ? (
        <>
          <p className="ua-text-metadata px-4 pt-2 pb-1">
            Customers
          </p>
          {state.customerResults.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
              style={{ background: state.activeIdx === customerStartIdx + i ? 'var(--ua-surface-secondary)' : 'transparent' }}
              onMouseEnter={() => dispatch({ type: 'setActiveIdx', activeIdx: customerStartIdx + i })}
              onClick={() => onCustomerSelect(c)}
            >
              <span
                className="ua-text-working-title flex h-7 w-7 items-center justify-center rounded-full shrink-0"
                style={{ background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-secondary)' }}
              >
                {(c.name?.[0] ?? '?').toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="ua-text-working-title truncate" style={{ color: 'var(--ua-text-primary)' }}>{c.name}</p>
                {c.email ? <p className="ua-text-caption-role truncate" style={{ color: 'var(--ua-text-secondary)' }}>{c.email}</p> : null}
              </div>
            </button>
          ))}
        </>
      ) : null}

      {state.unifiedResults.some((r) => r.type !== 'customer') ? (
        <>
          {/* Rendered in the same order the search API pushes results so the flat
              keyboard index model (nonCustomer array position) stays aligned. */}
          {UNIFIED_GROUPS.map(({ type, label }) => {
            const group = state.unifiedResults.filter((r) => r.type === type);
            if (!group.length) return null;
            const baseIdx = unifiedStartIdx + state.unifiedResults.filter((r) => r.type !== 'customer').indexOf(group[0]);
            const Icon = type === 'order' ? Hash : FileText;
            return (
              <div key={type}>
                <p className="ua-text-metadata px-4 pt-2 pb-1">
                  {label}
                </p>
                {group.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
                    style={{ background: state.activeIdx === baseIdx + i ? 'var(--ua-surface-secondary)' : 'transparent' }}
                    onMouseEnter={() => dispatch({ type: 'setActiveIdx', activeIdx: baseIdx + i })}
                    onClick={() => {
                      onClose();
                      router.push(item.href);
                    }}
                  >
                    <span
                      className="ua-text-metadata flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                      style={{ background: 'var(--ua-surface-secondary)', color: 'var(--ua-icon-secondary)' }}
                    >
                      <Icon size={13} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="ua-text-working-title truncate" style={{ color: 'var(--ua-text-primary)' }}>{item.label}</p>
                      {item.sublabel ? <p className="ua-text-caption-role" style={{ color: 'var(--ua-text-secondary)' }}>{item.sublabel}</p> : null}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </>
      ) : null}

      {state.searchError ? (
        <p role="alert" className="ua-text-caption-role px-4 py-2" style={{ color: 'var(--ua-critical)' }}>{state.searchError}</p>
      ) : null}

      {filteredNav.length > 0 || !state.query.trim() ? (
        <>
          {state.customerResults.length > 0 || state.query.trim() ? (
            <p className="ua-text-metadata px-4 pt-2 pb-1">
              Navigate
            </p>
          ) : null}
          {filteredNav.map((item, i) => (
            <button
              key={`${item.href}:${item.label}`}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ background: state.activeIdx === navStartIdx + i ? 'var(--ua-surface-secondary)' : 'transparent' }}
              onMouseEnter={() => dispatch({ type: 'setActiveIdx', activeIdx: navStartIdx + i })}
              onClick={() => onNavSelect(item)}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                style={{ background: 'var(--ua-surface-secondary)', color: 'var(--ua-icon-secondary)' }}
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>{item.label}</p>
                <p className="ua-text-caption-role" style={{ color: 'var(--ua-text-secondary)' }}>{item.description}</p>
              </div>
            </button>
          ))}
        </>
      ) : null}

      {filteredNav.length === 0 && state.customerResults.length === 0 && state.query.trim() && !state.searchingCustomers ? (
        <p className="ua-text-body px-4 py-6 text-center" style={{ color: 'var(--ua-text-secondary)' }}>
          No results for &ldquo;{state.query}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
