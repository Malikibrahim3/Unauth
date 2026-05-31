'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useTransition, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react';
import { labelFor } from '@/lib/copy/labels';
import { Button } from '@/components/ui';

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

/* ─── Shared input style ─────────────────────────────────────────── */
const inputCls =
  'h-9 w-full rounded-md px-3 text-[13px] focus:outline-none';
const inputStyle = {
  background: 'var(--bg-inset)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
};
const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = 'var(--border-strong)';
  e.target.style.outline = '2px solid var(--focus-ring)';
  e.target.style.outlineOffset = '2px';
};
const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = 'var(--border)';
  e.target.style.outline = 'none';
};

/* ─── Main component ─────────────────────────────────────────────── */
export default function CustomersFilterSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  /* ── Filter helpers ────────────────────────────────────────────── */
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
      router.push(pathname);
      router.refresh();
    });

  const hasAnyFilter =
    searchParams.toString().length > 0 &&
    ![...searchParams.keys()].every((p) => p === 'sort');

  const advancedKeys = [
    'ip', 'address', 'card', 'phone', 'riskMin', 'riskMax',
    'refundRateMin', 'refundRateMax', 'ordersMin', 'ordersMax', 'claimsMin',
    'claimsMax', 'chargebacksMin', 'merchantsMin', 'fastestClaimMax',
    'hasChargebacks', 'manuallyReviewed', 'firstSeenFrom', 'firstSeenTo',
    'lastSeenFrom', 'lastSeenTo', 'flag',
  ];
  const activeFiltersCount = advancedKeys.filter((k) => searchParams.has(k)).length;

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-0">
      {/* ── Toolbar row ────────────────────────────────────────── */}
      <div className="grid w-full grid-cols-1 gap-2 xl:grid-cols-[minmax(300px,1fr)_220px_auto_auto_auto]">
        {/* Search */}
        <input
          key={searchParams.get('q')}
          type="search"
          placeholder={`Search by ${labelFor('email').toLowerCase()}, ${labelFor('name').toLowerCase()}, or order reference…`}
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => makeDebounced('q', 2)(e.target.value)}
          className="h-9 min-w-[280px] rounded-md px-3 text-[13px] focus:outline-none"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
        />

        {/* Sort */}
        <select
          value={searchParams.get('sort') ?? 'risk'}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="h-9 rounded-md px-3 text-[13px] focus:outline-none"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="risk">Sort: Highest risk</option>
          <option value="recent">Sort: Most recent</option>
          <option value="oldest">Sort: Oldest first</option>
          <option value="orders">Sort: Most orders</option>
          <option value="refundRate">Sort: Highest refund rate</option>
          <option value="chargebacks">Sort: Most chargebacks</option>
          <option value="merchants">Sort: Most merchants</option>
          <option value="fastestClaim">Sort: Fastest claims</option>
        </select>

        {/* Status tabs — Link navigation so the server page re-fetches with filters */}
        <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
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
                className="inline-flex h-8 items-center px-2.5 text-xs font-medium rounded-md transition-all"
                style={
                  active
                    ? { background: 'var(--bg-surface)', color: 'var(--text)', boxShadow: 'var(--shadow-xs)' }
                    : { color: 'var(--text-muted)', background: 'transparent' }
                }
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Filters toggle button */}
        <Button
          onClick={() => setFiltersOpen((v) => !v)}
          variant={filtersOpen || activeFiltersCount > 0 ? 'primary' : 'secondary'}
          size="md"
          className="relative gap-1.5"
          style={{
            minWidth: 116,
          }}
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeFiltersCount > 0 && (
            <span
              className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
              style={{ background: 'var(--text-inverse)', color: 'var(--accent)' }}
            >
              {activeFiltersCount}
            </span>
          )}
          {filtersOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </Button>

        {hasAnyFilter && (
          <Button
            onClick={handleClearAll}
            variant="secondary"
            size="md"
            className="gap-1"
          >
            <X size={12} /> Clear
          </Button>
        )}
      </div>

      {/* ── Inline expanding filter panel ──────────────────────── */}
      {filtersOpen && (
        <div
          className="mt-2 rounded-md p-4 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          {/* Basic filters */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Risk level */}
            <div className="lg:col-span-3">
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-subtle)' }}>Match confidence</label>
              <select
                value={searchParams.get('risk') ?? ''}
                onChange={(e) => updateParam('risk', e.target.value)}
                className="h-9 w-full rounded-md px-3 text-[13px] focus:outline-none"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                <option value="">All confidence levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="lg:col-span-9 flex flex-wrap gap-x-5 gap-y-2 items-center pb-0.5">
              {[
                { key: 'hasRefunds', label: 'Has refunds' },
                { key: 'hasChargebacks', label: 'Has chargebacks' },
                { key: 'watchlisted', label: 'Watchlisted only' },
                { key: 'manuallyReviewed', label: 'Manually reviewed' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={searchParams.get(key) === '1'}
                    onChange={(e) => updateParam(key, e.target.checked ? '1' : '')}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Advanced filters toggle */}
          <div>
            <button
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold py-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {advancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Advanced filters
            </button>

            {advancedOpen && (
              <div className="mt-4 space-y-4">

                {/* Identity */}
                <div>
                  <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-secondary)' }}>Identity</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { key: 'ip', placeholder: labelFor('ip'), minLen: 4 },
                      { key: 'address', placeholder: 'Address (partial)', minLen: 4 },
                      { key: 'card', placeholder: `${labelFor('card')} ending`, minLen: 2 },
                      { key: 'phone', placeholder: `${labelFor('phone')} (partial)`, minLen: 4 },
                    ].map(({ key, placeholder, minLen }) => (
                      <input
                        key={`${key}-${searchParams.get(key)}`}
                        type="search"
                        placeholder={placeholder}
                        defaultValue={searchParams.get(key) ?? ''}
                        onChange={(e) => makeDebounced(key, minLen)(e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                    ))}
                  </div>
                </div>

                {/* Match confidence */}
                <div>
                  <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-secondary)' }}>Match confidence</p>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 max-w-md">
                    <input
                      key={searchParams.get('riskMin')}
                      type="number" min={0} max={100} placeholder="Min (0)"
                      defaultValue={searchParams.get('riskMin') ?? ''}
                      onChange={(e) => makeDebounced('riskMin', 1)(e.target.value)}
                      className={inputCls}
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-subtle)' }}>–</span>
                    <input
                      key={searchParams.get('riskMax')}
                      type="number" min={0} max={100} placeholder="Max (100)"
                      defaultValue={searchParams.get('riskMax') ?? ''}
                      onChange={(e) => makeDebounced('riskMax', 1)(e.target.value)}
                      className={inputCls}
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                  </div>
                </div>

                {/* Behaviour */}
                <div>
                  <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-secondary)' }}>Behaviour</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      { label: 'Refund rate %', minKey: 'refundRateMin', maxKey: 'refundRateMax', min: 0, max: 100 },
                      { label: 'Total orders', minKey: 'ordersMin', maxKey: 'ordersMax', min: 0, max: undefined },
                      { label: 'Refund claims', minKey: 'claimsMin', maxKey: 'claimsMax', min: 0, max: undefined },
                    ].map(({ label, minKey, maxKey, min, max }) => (
                      <div key={label} className="space-y-1">
                        <label className="text-xs" style={{ color: 'var(--text-subtle)' }}>{label}</label>
                        <div className="flex items-center gap-1">
                          <input key={searchParams.get(minKey)} type="number" min={min} max={max} placeholder="Min" defaultValue={searchParams.get(minKey) ?? ''} onChange={(e) => makeDebounced(minKey, 1)(e.target.value)} className={inputCls} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>–</span>
                          <input key={searchParams.get(maxKey)} type="number" min={min} max={max} placeholder="Max" defaultValue={searchParams.get(maxKey) ?? ''} onChange={(e) => makeDebounced(maxKey, 1)(e.target.value)} className={inputCls} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                        </div>
                      </div>
                    ))}
                    {[
                      { label: 'Chargebacks ≥', key: 'chargebacksMin', min: 0, placeholder: 'e.g. 1' },
                      { label: 'Merchants seen at ≥', key: 'merchantsMin', min: 1, placeholder: 'e.g. 2' },
                      { label: 'Fastest claim ≤ days', key: 'fastestClaimMax', min: 0, placeholder: 'e.g. 3' },
                    ].map(({ label, key, min, placeholder }) => (
                      <div key={label} className="space-y-1">
                        <label className="text-xs" style={{ color: 'var(--text-subtle)' }}>{label}</label>
                        <input key={searchParams.get(key)} type="number" min={min} placeholder={placeholder} defaultValue={searchParams.get(key) ?? ''} onChange={(e) => makeDebounced(key, 1)(e.target.value)} className={inputCls} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date ranges */}
                <div>
                  <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-secondary)' }}>Date ranges</p>
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {[
                      { label: 'First seen', fromKey: 'firstSeenFrom', toKey: 'firstSeenTo' },
                      { label: 'Last seen', fromKey: 'lastSeenFrom', toKey: 'lastSeenTo' },
                    ].map(({ label, fromKey, toKey }) => (
                      <div key={label} className="space-y-1">
                        <label className="text-xs" style={{ color: 'var(--text-subtle)' }}>{label}</label>
                        <div className="flex items-center gap-1">
                          <input type="date" value={searchParams.get(fromKey) ?? ''} onChange={(e) => updateParam(fromKey, e.target.value)} className="h-9 flex-1 rounded-md px-2 text-[13px] focus:outline-none" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>–</span>
                          <input type="date" value={searchParams.get(toKey) ?? ''} onChange={(e) => updateParam(toKey, e.target.value)} className="h-9 flex-1 rounded-md px-2 text-[13px] focus:outline-none" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Identity signal */}
                <div>
                  <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-secondary)' }}>Identity signal</p>
                  <input
                    key={searchParams.get('flag')}
                    type="search"
                    placeholder="e.g. rapid_refund, multi_merchant, velocity…"
                    defaultValue={searchParams.get('flag') ?? ''}
                    onChange={(e) => makeDebounced('flag', 2)(e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Clear all */}
          {hasAnyFilter && (
            <div className="pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <Button
                onClick={handleClearAll}
                variant="secondary"
                size="md"
                className="gap-1.5"
              >
                <X size={12} /> Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
