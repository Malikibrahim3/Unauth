'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useTransition, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

export default function CustomersFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [advancedOpen, setAdvancedOpen] = useState(() => {
    // Auto-open advanced if any advanced param is set
    const advanced = ['ip','address','card','phone','riskMin','riskMax',
      'refundRateMin','refundRateMax','ordersMin','ordersMax','claimsMin',
      'claimsMax','chargebacksMin','merchantsMin','fastestClaimMax',
      'hasChargebacks','manuallyReviewed','firstSeenFrom','firstSeenTo',
      'lastSeenFrom','lastSeenTo','flag'];
    return advanced.some(k => searchParams.has(k));
  });

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const makeDebounced = (key: string, minLen = 2) => (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (value.length === 0 || value.length >= minLen) {
        updateParam(key, value);
      }
    }, 350);
  };

  const handleClearAll = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasAnyFilter = searchParams.toString().length > 0 &&
    !['sort'].every(k => [...searchParams.keys()].every(p => p === k));

  return (
    <div className="space-y-3 rounded-xl p-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
      {/* Row 1: main search + sort + clear */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          key={searchParams.get('q')}
          type="search"
          placeholder="Search by email or name…"
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => makeDebounced('q', 2)(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
          onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
        />
        <select
          value={searchParams.get('risk') ?? ''}
          onChange={(e) => updateParam('risk', e.target.value)}
          className="text-xs rounded-lg px-2 py-2 focus:outline-none"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="">All risk levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={searchParams.get('sort') ?? 'risk'}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="text-xs rounded-lg px-2 py-2 focus:outline-none"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
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
        {hasAnyFilter && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 text-xs rounded-lg px-2 py-2 border transition-colors"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-subtle)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = ''; }}
          >
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      {/* Row 2: quick toggles */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={searchParams.get('hasRefunds') === '1'}
            onChange={(e) => updateParam('hasRefunds', e.target.checked ? '1' : '')}
            className="rounded"
          />
          Has refunds
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={searchParams.get('hasChargebacks') === '1'}
            onChange={(e) => updateParam('hasChargebacks', e.target.checked ? '1' : '')}
            className="rounded"
          />
          Has chargebacks
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={searchParams.get('watchlisted') === '1'}
            onChange={(e) => updateParam('watchlisted', e.target.checked ? '1' : '')}
            className="rounded"
          />
          Watchlisted only
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={searchParams.get('manuallyReviewed') === '1'}
            onChange={(e) => updateParam('manuallyReviewed', e.target.checked ? '1' : '')}
            className="rounded"
          />
          Manually reviewed
        </label>

        <button
          onClick={() => setAdvancedOpen(v => !v)}
          className="ml-auto flex items-center gap-1 text-xs font-semibold"
          style={{ color: 'var(--text)' }}
        >
          Advanced filters {advancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Advanced section */}
      {advancedOpen && (
        <div className="pt-4 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>

          {/* Identity */}
          <div>
            <p className="text-overline mb-2" style={{ color: 'var(--text-muted)' }}>Identity</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[{ key: 'ip', placeholder: 'IP address', minLen: 4 }, { key: 'address', placeholder: 'Address (partial)', minLen: 4 }, { key: 'card', placeholder: 'Card last 4', minLen: 2 }, { key: 'phone', placeholder: 'Phone (partial)', minLen: 4 }].map(({ key, placeholder, minLen }) => (
                <input
                  key={`${key}-${searchParams.get(key)}`}
                  type="search"
                  placeholder={placeholder}
                  defaultValue={searchParams.get(key) ?? ''}
                  onChange={(e) => makeDebounced(key, minLen)(e.target.value)}
                  className="rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
                />
              ))}
            </div>
          </div>

          {/* Match confidence range */}
          <div>
            <p className="text-overline mb-2" style={{ color: 'var(--text-muted)' }}>Match confidence</p>
            <div className="flex items-center gap-2">
              <input
                key={searchParams.get('riskMin')}
                type="number"
                min={0} max={100}
                placeholder="Min (0)"
                defaultValue={searchParams.get('riskMin') ?? ''}
                onChange={(e) => makeDebounced('riskMin', 1)(e.target.value)}
                className="w-24 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
              />
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>–</span>
              <input
                key={searchParams.get('riskMax')}
                type="number"
                min={0} max={100}
                placeholder="Max (100)"
                defaultValue={searchParams.get('riskMax') ?? ''}
                onChange={(e) => makeDebounced('riskMax', 1)(e.target.value)}
                className="w-24 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
              />
            </div>
          </div>

          {/* Behaviour ranges */}
          <div>
            <p className="text-overline mb-2" style={{ color: 'var(--text-muted)' }}>Behaviour</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Refund rate %', minKey: 'refundRateMin', maxKey: 'refundRateMax', min: 0, max: 100 },
                { label: 'Total orders', minKey: 'ordersMin', maxKey: 'ordersMax', min: 0 },
                { label: 'Refund claims', minKey: 'claimsMin', maxKey: 'claimsMax', min: 0 },
              ].map(({ label, minKey, maxKey, min, max }) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs" style={{ color: 'var(--text-subtle)' }}>{label}</label>
                  <div className="flex items-center gap-1">
                    <input key={searchParams.get(minKey)} type="number" min={min} max={max} placeholder="Min" defaultValue={searchParams.get(minKey) ?? ''} onChange={(e) => makeDebounced(minKey, 1)(e.target.value)}
                      className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
                    />
                    <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>–</span>
                    <input key={searchParams.get(maxKey)} type="number" min={min} max={max} placeholder="Max" defaultValue={searchParams.get(maxKey) ?? ''} onChange={(e) => makeDebounced(maxKey, 1)(e.target.value)}
                      className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
                    />
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
                  <input key={searchParams.get(key)} type="number" min={min} placeholder={placeholder} defaultValue={searchParams.get(key) ?? ''} onChange={(e) => makeDebounced(key, 1)(e.target.value)}
                    className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Date ranges */}
          <div>
            <p className="text-overline mb-2" style={{ color: 'var(--text-muted)' }}>Date ranges</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'First seen', fromKey: 'firstSeenFrom', toKey: 'firstSeenTo' },
                { label: 'Last seen', fromKey: 'lastSeenFrom', toKey: 'lastSeenTo' },
              ].map(({ label, fromKey, toKey }) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs" style={{ color: 'var(--text-subtle)' }}>{label}</label>
                  <div className="flex items-center gap-1">
                    <input type="date" value={searchParams.get(fromKey) ?? ''} onChange={(e) => updateParam(fromKey, e.target.value)}
                      className="flex-1 rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
                    />
                    <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>–</span>
                    <input type="date" value={searchParams.get(toKey) ?? ''} onChange={(e) => updateParam(toKey, e.target.value)}
                      className="flex-1 rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud flag */}
          <div>
            <p className="text-overline mb-2" style={{ color: 'var(--text-muted)' }}>Fraud flag</p>
            <input
              key={searchParams.get('flag')}
              type="search"
              placeholder="e.g. rapid_refund, multi_merchant, velocity…"
              defaultValue={searchParams.get('flag') ?? ''}
              onChange={(e) => makeDebounced('flag', 2)(e.target.value)}
              className="w-full sm:w-80 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
