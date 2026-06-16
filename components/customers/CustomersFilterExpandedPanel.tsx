'use client';

import Link from 'next/link';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { labelFor } from '@/lib/copy/labels';
import { Button } from '@/components/ui';
import {
  inputBlur,
  inputCls,
  inputFocus,
  inputStyle,
} from '@/components/customers/customersFilterInputStyles';

export function CustomersFilterExpandedPanel({
  searchParams,
  advancedOpen,
  setAdvancedOpen,
  updateParam,
  makeDebounced,
  hasAnyFilter,
  handleClearAll,
}: {
  searchParams: ReadonlyURLSearchParams;
  advancedOpen: boolean;
  setAdvancedOpen: React.Dispatch<React.SetStateAction<boolean>>;
  updateParam: (key: string, value: string) => void;
  makeDebounced: (key: string, minLen?: number) => (value: string) => void;
  hasAnyFilter: boolean;
  handleClearAll: () => void;
}) {
  return (
    <div
      className="mt-2 rounded-md p-4 space-y-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)' }}
    >
{/* ── Inline expanding filter panel ──────────────────────── */}
                {/* Basic filters */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Risk level */}
            <div className="lg:col-span-3">
              <label htmlFor="customers-filter-risk" className="block text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Identity confidence</label>
              <select
                id="customers-filter-risk"
                value={searchParams.get('risk') ?? ''}
                onChange={(e) => updateParam('risk', e.target.value)}
                className="h-9 w-full rounded-md px-3 text-[13px] focus:outline-none"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                <option value="">All identity bands</option>
                <option value="low">Light identity band</option>
                <option value="medium">Moderate identity band</option>
                <option value="high">Strong identity band</option>
                <option value="critical">Very strong identity band</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="lg:col-span-9 flex flex-wrap gap-x-5 gap-y-2 items-center pb-0.5">
              {[
                { key: 'openClaims', label: 'Open claims for review' },
                { key: 'hasRefunds', label: 'Has refunds' },
                { key: 'hasChargebacks', label: 'Has chargebacks' },
                { key: 'manuallyReviewed', label: 'Manually reviewed' },
              ].map(({ key, label }) => (
                <label key={key} htmlFor={`customers-filter-${key}`} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    id={`customers-filter-${key}`}
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
type="button"               onClick={() => setAdvancedOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold py-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {advancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Advanced filters
            </button>

            {advancedOpen && (
              <div className="mt-4 space-y-4">

                {/* Identity */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Identity</p>
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
                        aria-label={placeholder}
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
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Identity confidence</p>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 max-w-md">
                    <input
                      key={`riskMin-${searchParams.get('riskMin') ?? ''}`}
                      type="number" min={0} max={100} aria-label="Minimum identity confidence"
                      placeholder="Min (0)"
                      defaultValue={searchParams.get('riskMin') ?? ''}
                      onChange={(e) => makeDebounced('riskMin', 1)(e.target.value)}
                      className={inputCls}
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>–</span>
                    <input
                      key={`riskMax-${searchParams.get('riskMax') ?? ''}`}
                      type="number" min={0} max={100} aria-label="Maximum identity confidence"
                      placeholder="Max (100)"
                      defaultValue={searchParams.get('riskMax') ?? ''}
                      onChange={(e) => makeDebounced('riskMax', 1)(e.target.value)}
                      className={inputCls}
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                  </div>
                </div>

                {/* Behaviour */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Behaviour</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      { label: 'Refund rate %', minKey: 'refundRateMin', maxKey: 'refundRateMax', min: 0, max: 100 },
                      { label: 'Total orders', minKey: 'ordersMin', maxKey: 'ordersMax', min: 0, max: undefined },
                      { label: 'Refund claims', minKey: 'claimsMin', maxKey: 'claimsMax', min: 0, max: undefined },
                    ].map(({ label, minKey, maxKey, min, max }) => (
                      <div key={label} className="space-y-1">
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                        <div className="flex items-center gap-1">
                          <input key={`${minKey}-${searchParams.get(minKey) ?? ''}`} type="number" min={min} max={max} aria-label={`${label} minimum`} placeholder="Min" defaultValue={searchParams.get(minKey) ?? ''} onChange={(e) => makeDebounced(minKey, 1)(e.target.value)} className={inputCls} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>–</span>
                          <input key={`${maxKey}-${searchParams.get(maxKey) ?? ''}`} type="number" min={min} max={max} aria-label={`${label} maximum`} placeholder="Max" defaultValue={searchParams.get(maxKey) ?? ''} onChange={(e) => makeDebounced(maxKey, 1)(e.target.value)} className={inputCls} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                        </div>
                      </div>
                    ))}
                    {[
                      { label: 'Chargebacks ≥', key: 'chargebacksMin', min: 0, placeholder: 'e.g. 1' },
                      { label: 'Merchants seen at ≥', key: 'merchantsMin', min: 1, placeholder: 'e.g. 2' },
                      { label: 'Fastest claim ≤ days', key: 'fastestClaimMax', min: 0, placeholder: 'e.g. 3' },
                    ].map(({ label, key, min, placeholder }) => (
                      <div key={label} className="space-y-1">
                        <label htmlFor={`customers-filter-${key}`} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
                        <input id={`customers-filter-${key}`} key={searchParams.get(key)} type="number" min={min} aria-label={label} placeholder={placeholder} defaultValue={searchParams.get(key) ?? ''} onChange={(e) => makeDebounced(key, 1)(e.target.value)} className={inputCls} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date ranges */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Date ranges</p>
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {[
                      { label: 'First seen', fromKey: 'firstSeenFrom', toKey: 'firstSeenTo' },
                      { label: 'Last seen', fromKey: 'lastSeenFrom', toKey: 'lastSeenTo' },
                    ].map(({ label, fromKey, toKey }) => (
                      <div key={label} className="space-y-1">
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                        <div className="flex items-center gap-1">
                          <input type="date" aria-label={`${label} from`} value={searchParams.get(fromKey) ?? ''} onChange={(e) => updateParam(fromKey, e.target.value)} className="h-9 flex-1 rounded-md px-2 text-[13px] focus:outline-none" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>–</span>
                          <input type="date" aria-label={`${label} to`} value={searchParams.get(toKey) ?? ''} onChange={(e) => updateParam(toKey, e.target.value)} className="h-9 flex-1 rounded-md px-2 text-[13px] focus:outline-none" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Identity signal */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Identity signal</p>
                  <label htmlFor="customers-filter-flag" className="sr-only">Identity signal</label>
                  <input
                    id="customers-filter-flag"
                    key={searchParams.get('flag')}
                    type="search"
                    aria-label="Identity signal"
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
            <div className="pt-2" style={{ borderTop: '1px solid var(--border-muted)' }}>
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
  );
}
