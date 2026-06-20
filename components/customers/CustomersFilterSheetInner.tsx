'use client';

import Link from 'next/link';
import { useRouter, type ReadonlyURLSearchParams } from 'next/navigation';
import { useCallback, useTransition, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react';
import { labelFor } from '@/lib/copy/labels';
import { Button } from '@/components/ui';
import { CustomersFilterExpandedPanel } from '@/components/customers/CustomersFilterExpandedPanel';

function buildCustomersHref(
  searchParams: URLSearchParams,
  overrides: Record<string, string | undefined> = {},
) {
  const params = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  }
  params.delete('page');
  const qs = params.toString();
  return qs ? `/customers?${qs}` : '/customers';
}

const ADVANCED_FILTER_KEYS = [
  'ip', 'address', 'card', 'phone', 'riskMin', 'riskMax',
  'refundRateMin', 'refundRateMax', 'ordersMin', 'ordersMax', 'claimsMin',
  'claimsMax', 'chargebacksMin', 'merchantsMin', 'fastestClaimMax',
  'hasChargebacks', 'manuallyReviewed', 'firstSeenFrom', 'firstSeenTo',
  'lastSeenFrom', 'lastSeenTo', 'flag',
] as const;

export function CustomersFilterSheetInner({
  searchParams,
}: {
  searchParams: ReadonlyURLSearchParams;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(() => {
    const advanced = [
      'ip', 'address', 'card', 'phone', 'riskMin', 'riskMax',
      'refundRateMin', 'refundRateMax', 'ordersMin', 'ordersMax', 'claimsMin',
      'claimsMax', 'chargebacksMin', 'merchantsMin', 'fastestClaimMax',
      'hasChargebacks', 'manuallyReviewed', 'firstSeenFrom', 'firstSeenTo',
      'lastSeenFrom', 'lastSeenTo', 'flag', 'status',
    ];
    return advanced.some((k) => searchParams.has(k));
  });

  const updateParam = useCallback(
    (key: string, value: string) => {
      const href = buildCustomersHref(searchParams, { [key]: value || undefined });
      startTransition(() => {
        router.push(href);
        router.refresh();
      });
    },
    [router, searchParams],
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const makeDebounced = (key: string, minLen = 2) => (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (value.length === 0 || value.length >= minLen) updateParam(key, value);
    }, 350);
  };

  const handleClearAll = () =>
    startTransition(() => {
      router.push('/customers');
      router.refresh();
    });

  const hasAnyFilter =
    searchParams.toString().length > 0 &&
    ![...searchParams.keys()].every((p) => p === 'sort');

  const activeFiltersCount = ADVANCED_FILTER_KEYS.filter((k) => searchParams.has(k)).length;

  return (
    <div className="space-y-0">
      <div className="grid w-full grid-cols-1 gap-2 xl:grid-cols-[minmax(300px,1fr)_220px_auto_auto_auto]">
        <input
          key={searchParams.get('q')}
          type="search"
          aria-label={`Search by ${labelFor('email').toLowerCase()}, ${labelFor('name').toLowerCase()}, or order reference`}
          placeholder={`Search by ${labelFor('email').toLowerCase()}, ${labelFor('name').toLowerCase()}, or order reference…`}
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => makeDebounced('q', 2)(e.target.value)}
          className="h-9 min-w-[280px] rounded-md px-3 text-[13px] focus:outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
        />

        <select
          aria-label="Sort customer history"
          value={searchParams.get('sort') ?? 'risk'}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="h-9 rounded-md px-3 text-[13px] focus:outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="risk">Sort: Strongest evidence match</option>
          <option value="recent">Sort: Most recent</option>
          <option value="oldest">Sort: Oldest first</option>
          <option value="orders">Sort: Most orders</option>
          <option value="refundRate">Sort: Most refund claims</option>
          <option value="chargebacks">Sort: Most chargebacks</option>
          <option value="fastestClaim">Sort: Fastest claims</option>
        </select>

        <div className="flex items-center gap-0.5 rounded-md p-0.5" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-muted)' }}>
          {[
            { value: '', label: 'All' },
            { value: 'new', label: 'New' },
            { value: 'under_review', label: 'Review' },
            { value: 'contacted', label: 'Contacted' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'cleared', label: 'Cleared' },
          ].map(({ value, label }) => {
            const active = (searchParams.get('status') ?? '') === value;
            return (
              <Link
                key={value || 'all'}
                href={buildCustomersHref(searchParams, { status: value || undefined })}
                scroll={false}
                className="inline-flex h-8 items-center px-2.5 text-xs font-medium rounded-md transition-colors"
                style={
                  active
                    ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-xs)' }
                    : { color: 'var(--text-secondary)', background: 'transparent' }
                }
              >
                {label}
              </Link>
            );
          })}
        </div>

        <Button
          onClick={() => setFiltersOpen((v) => !v)}
          variant={filtersOpen || activeFiltersCount > 0 ? 'primary' : 'secondary'}
          size="md"
          className="relative gap-1.5"
          style={{ minWidth: 116 }}
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeFiltersCount > 0 && (
            <span
              className="flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold"
              style={{ background: 'white', color: 'var(--accent)' }}
            >
              {activeFiltersCount}
            </span>
          )}
          {filtersOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </Button>

        {hasAnyFilter && (
          <Button onClick={handleClearAll} variant="secondary" size="md" className="gap-1">
            <X size={12} /> Clear
          </Button>
        )}
      </div>

      {filtersOpen ? (
        <CustomersFilterExpandedPanel
          searchParams={searchParams}
          advancedOpen={advancedOpen}
          setAdvancedOpen={setAdvancedOpen}
          updateParam={updateParam}
          makeDebounced={makeDebounced}
          hasAnyFilter={hasAnyFilter}
          handleClearAll={handleClearAll}
        />
      ) : null}
    </div>
  );
}
