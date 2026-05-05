'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

interface CustomerResult {
  id: string;
  name: string;
  email: string | null;
  risk_level: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Risk Overview',
    description: 'Dashboard, key metrics and trends',
    href: '/dashboard',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    label: 'Customers',
    description: 'Browse and search customer profiles',
    href: '/customers',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'New audit',
    description: 'Upload a CSV and run analysis',
    href: '/upload',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 11V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 13h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Evidence packages',
    description: 'Download chargeback evidence',
    href: '/chargebacks',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="2" y="12" width="12" height="2" rx="1" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    label: 'Watchlist',
    description: 'Monitored high-risk customers',
    href: '/watchlist',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 1.5L9.854 5.41l4.146.603-3 2.922.708 4.125L8 10.896l-3.708 1.164.708-4.125-3-2.922 4.146-.603L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Inbox',
    description: 'Flagged transactions to review',
    href: '/inbox',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1 6h14" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 10h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Audit history',
    description: 'Past audit runs and results',
    href: '/history',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'High-confidence flags',
    description: 'Customers with grade A or B risk',
    href: '/customers?risk=high',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2L9.5 6h4L10 9l1.5 5L8 12l-3.5 2L6 9 2.5 6h4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Needs review queue',
    description: 'Customers with status: needs review',
    href: '/customers?status=needs_review',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 5v3M8 11v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    description: 'Account and team settings',
    href: '/settings',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

const RISK_LEVEL_COLORS: Record<string, string> = {
  critical: 'var(--risk-critical)',
  high: 'var(--risk-high)',
  medium: 'var(--risk-medium)',
  low: 'var(--risk-low)',
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredNav = query.trim()
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()),
      )
    : NAV_ITEMS;

  // Search customers when query has ≥2 chars
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchingCustomers(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/customers/search?q=${encodeURIComponent(query.trim())}&limit=5`)
        .then(r => r.ok ? r.json() : { results: [] })
        .then((data: { results?: CustomerResult[] }) => setCustomerResults(data.results ?? []))
        .catch(() => setCustomerResults([]))
        .finally(() => setSearchingCustomers(false));
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Total items: customer results + nav items (+ 1 for the search action row when query present)
  const totalItems = (query.trim() ? 1 : 0) + customerResults.length + filteredNav.length;

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIdx(0);
      setCustomerResults([]);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (item: NavItem) => {
      onClose();
      router.push(item.href);
    },
    [router, onClose],
  );

  const handleCustomerSelect = useCallback(
    (customer: CustomerResult) => {
      onClose();
      router.push(`/customers/${customer.id}`);
    },
    [router, onClose],
  );

  const handleSearchSubmit = useCallback(() => {
    if (query.trim()) {
      onClose();
      router.push(`/customers?q=${encodeURIComponent(query.trim())}`);
    } else if (filteredNav.length > 0) {
      handleSelect(filteredNav[activeIdx] ?? filteredNav[0]);
    }
  }, [query, filteredNav, activeIdx, onClose, router, handleSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, totalItems - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (query.trim()) {
          // index 0 = search action
          if (activeIdx === 0) { handleSearchSubmit(); return; }
          // indices 1..customerResults.length = customers
          const customerOffset = 1;
          if (activeIdx < customerOffset + customerResults.length) {
            handleCustomerSelect(customerResults[activeIdx - customerOffset]);
            return;
          }
          // rest = nav
          const navOffset = customerOffset + customerResults.length;
          const navItem = filteredNav[activeIdx - navOffset];
          if (navItem) handleSelect(navItem);
        } else {
          const navItem = filteredNav[activeIdx];
          if (navItem) handleSelect(navItem);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filteredNav, activeIdx, query, customerResults, handleSelect, handleCustomerSelect, handleSearchSubmit, onClose, totalItems],
  );

  // Keep active index in bounds when filter changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  if (!isOpen) return null;

  // Build a flat index for active highlight
  let globalIdx = 0;
  const searchRowIdx = query.trim() ? globalIdx++ : -1;
  const customerStartIdx = globalIdx;
  globalIdx += customerResults.length;
  const navStartIdx = globalIdx;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{ color: 'var(--icon-muted)', flexShrink: 0 }}
          >
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search customers, audits, evidence packages…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
            style={{ color: 'var(--text)' }}
            autoComplete="off"
            spellCheck={false}
          />
          {searchingCustomers && (
            <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
          )}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ color: 'var(--text-subtle)', background: 'var(--bg-subtle)' }}
            >
              Clear
            </button>
          )}
          <kbd
            className="hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ color: 'var(--text-subtle)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {/* Search-all row */}
          {query.trim() && (
            <button
              type="button"
              className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors')}
              style={{ background: activeIdx === searchRowIdx ? 'var(--bg-subtle)' : 'transparent' }}
              onClick={handleSearchSubmit}
              onMouseEnter={() => setActiveIdx(searchRowIdx)}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                style={{ background: 'var(--bg-subtle)', color: 'var(--icon-muted)' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  Search customers for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Browse all matching profiles</p>
              </div>
              <span className="ml-auto shrink-0">
                <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--text-subtle)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>↵</kbd>
              </span>
            </button>
          )}

          {/* Customer results */}
          {customerResults.length > 0 && (
            <>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>Customers</p>
              {customerResults.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
                  style={{ background: activeIdx === customerStartIdx + i ? 'var(--bg-subtle)' : 'transparent' }}
                  onMouseEnter={() => setActiveIdx(customerStartIdx + i)}
                  onClick={() => handleCustomerSelect(c)}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full shrink-0 text-xs font-bold"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                  >
                    {(c.name?.[0] ?? '?').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{c.name}</p>
                    {c.email && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.email}</p>}
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: RISK_LEVEL_COLORS[c.risk_level] ?? 'var(--text-muted)', background: 'var(--bg-subtle)' }}
                  >
                    {c.risk_level}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Nav items */}
          {(filteredNav.length > 0 || !query.trim()) && (
            <>
              {(customerResults.length > 0 || query.trim()) && (
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>Navigate</p>
              )}
              {filteredNav.map((item, i) => (
                <button
                  key={item.href}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{ background: activeIdx === navStartIdx + i ? 'var(--bg-subtle)' : 'transparent' }}
                  onMouseEnter={() => setActiveIdx(navStartIdx + i)}
                  onClick={() => handleSelect(item)}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--icon-muted)' }}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
                  </div>
                  <span className="ml-auto shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--text-subtle)' }} aria-hidden="true">
                      <path d="M3 6h6M7 4l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              ))}
            </>
          )}

          {filteredNav.length === 0 && customerResults.length === 0 && query.trim() && !searchingCustomers && (
            <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-4 py-2"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>
            <kbd className="font-mono mr-1">↑↓</kbd>navigate
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>
            <kbd className="font-mono mr-1">↵</kbd>open
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>
            <kbd className="font-mono mr-1">esc</kbd>close
          </span>
        </div>
      </div>
    </>
  );
}

