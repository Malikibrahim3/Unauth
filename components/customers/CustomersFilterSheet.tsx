'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useTransition, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react';

/* ─── Shared input style ─────────────────────────────────────────── */
const inputCls =
  'w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none';
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
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete('page');
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams],
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const makeDebounced = (key: string, minLen = 2) => (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (value.length === 0 || value.length >= minLen) updateParam(key, value);
    }, 350);
  };

  const handleClearAll = () =>
    startTransition(() => router.push(pathname));

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
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <input
          key={searchParams.get('q')}
          type="search"
          placeholder="Search by email or name…"
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => makeDebounced('q', 2)(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
        />

        {/* Sort */}
        <select
          value={searchParams.get('sort') ?? 'risk'}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="text-xs rounded-lg px-2 py-2 focus:outline-none"
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

        {/* Status tabs */}
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
              <button
                key={value || 'all'}
                onClick={() => updateParam('status', value)}
                className="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                style={
                  active
                    ? { background: 'var(--bg-surface)', color: 'var(--text)', boxShadow: 'var(--shadow-xs)' }
                    : { color: 'var(--text-muted)', background: 'transparent' }
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Filters toggle button */}
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors relative"
          style={{
            background: filtersOpen || activeFiltersCount > 0 ? 'var(--accent)' : 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: filtersOpen || activeFiltersCount > 0 ? 'var(--text-inverse)' : 'var(--text)',
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
        </button>

        {hasAnyFilter && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 text-xs rounded-lg px-2 py-2 border transition-colors"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-subtle)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = ''; }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* ── Inline expanding filter panel ──────────────────────── */}
      {filtersOpen && (
        <div
          className="mt-2 rounded-xl p-5 space-y-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          {/* Basic filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Risk level */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-subtle)' }}>Match confidence</label>
              <select
                value={searchParams.get('risk') ?? ''}
                onChange={(e) => updateParam('risk', e.target.value)}
                className="w-full text-xs rounded-lg px-2 py-2 focus:outline-none"
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
            <div className="col-span-2 sm:col-span-2 lg:col-span-3 flex flex-wrap gap-x-5 gap-y-2 items-end pb-0.5">
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
              <div className="mt-4 space-y-5">

                {/* Identity */}
                <div>
                  <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Identity</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'ip', placeholder: 'IP address', minLen: 4 },
                      { key: 'address', placeholder: 'Address (partial)', minLen: 4 },
                      { key: 'card', placeholder: 'Card last 4', minLen: 2 },
                      { key: 'phone', placeholder: 'Phone (partial)', minLen: 4 },
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
                  <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Match confidence</p>
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      key={searchParams.get('riskMin')}
                      type="number" min={0} max={100} placeholder="Min (0)"
                      defaultValue={searchParams.get('riskMin') ?? ''}
                      onChange={(e) => makeDebounced('riskMin', 1)(e.target.value)}
                      className="w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-subtle)' }}>–</span>
                    <input
                      key={searchParams.get('riskMax')}
                      type="number" min={0} max={100} placeholder="Max (100)"
                      defaultValue={searchParams.get('riskMax') ?? ''}
                      onChange={(e) => makeDebounced('riskMax', 1)(e.target.value)}
                      className="w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                  </div>
                </div>

                {/* Behaviour */}
                <div>
                  <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Behaviour</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Refund rate %', minKey: 'refundRateMin', maxKey: 'refundRateMax', min: 0, max: 100 },
                      { label: 'Total orders', minKey: 'ordersMin', maxKey: 'ordersMax', min: 0, max: undefined },
                      { label: 'Refund claims', minKey: 'claimsMin', maxKey: 'claimsMax', min: 0, max: undefined },
                    ].map(({ label, minKey, maxKey, min, max }) => (
                      <div key={label} className="space-y-1">
                        <label className="text-xs" style={{ color: 'var(--text-subtle)' }}>{label}</label>
                        <div className="flex items-center gap-1">
                          <input key={searchParams.get(minKey)} type="number" min={min} max={max} placeholder="Min" defaultValue={searchParams.get(minKey) ?? ''} onChange={(e) => makeDebounced(minKey, 1)(e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>–</span>
                          <input key={searchParams.get(maxKey)} type="number" min={min} max={max} placeholder="Max" defaultValue={searchParams.get(maxKey) ?? ''} onChange={(e) => makeDebounced(maxKey, 1)(e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
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
                        <input key={searchParams.get(key)} type="number" min={min} placeholder={placeholder} defaultValue={searchParams.get(key) ?? ''} onChange={(e) => makeDebounced(key, 1)(e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date ranges */}
                <div>
                  <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Date ranges</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'First seen', fromKey: 'firstSeenFrom', toKey: 'firstSeenTo' },
                      { label: 'Last seen', fromKey: 'lastSeenFrom', toKey: 'lastSeenTo' },
                    ].map(({ label, fromKey, toKey }) => (
                      <div key={label} className="space-y-1">
                        <label className="text-xs" style={{ color: 'var(--text-subtle)' }}>{label}</label>
                        <div className="flex items-center gap-1">
                          <input type="date" value={searchParams.get(fromKey) ?? ''} onChange={(e) => updateParam(fromKey, e.target.value)} className="flex-1 rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>–</span>
                          <input type="date" value={searchParams.get(toKey) ?? ''} onChange={(e) => updateParam(toKey, e.target.value)} className="flex-1 rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Identity signal */}
                <div>
                  <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Identity signal</p>
                  <input
                    key={searchParams.get('flag')}
                    type="search"
                    placeholder="e.g. rapid_refund, multi_merchant, velocity…"
                    defaultValue={searchParams.get('flag') ?? ''}
                    onChange={(e) => makeDebounced('flag', 2)(e.target.value)}
                    className="w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none"
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
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <X size={12} /> Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
