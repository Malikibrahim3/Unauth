'use client';

import { useRouter, type ReadonlyURLSearchParams } from 'next/navigation';
import { useCallback, useTransition, useRef, useState } from 'react';
import { ListFilter, X } from 'lucide-react';
import { labelFor } from '@/lib/copy/labels';
import { Button, Drawer, Select } from '@/components/ui';

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

const SORT_OPTIONS = [
  { value: 'recent', label: 'Sort: Most recent order' },
  { value: 'orders', label: 'Sort: Most orders' },
  { value: 'cases', label: 'Sort: Most cases' },
  { value: 'name', label: 'Sort: Name A–Z' },
] as const;

const RISK_OPTIONS = [
  { value: '', label: 'All case signals' },
  { value: 'case_history', label: 'Any case history' },
  { value: 'refund', label: 'Refund history' },
  { value: 'chargeback', label: 'Chargeback history' },
] as const;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open_cases', label: 'Open cases' },
] as const;

export function CustomersFilterSheetInner({
  searchParams,
}: {
  searchParams: ReadonlyURLSearchParams;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    ![...searchParams.keys()].every((p) => ['sort', 'selected', 'page', 'pageSize'].includes(p));

  const currentSort = searchParams.get('sort') ?? 'recent';
  const sortValue = SORT_OPTIONS.some((o) => o.value === currentSort) ? currentSort : 'recent';

  const activeFilterCount = Number(Boolean(searchParams.get('risk'))) + Number(Boolean(searchParams.get('status')));

  return (
    <div className="uo-customer-filter-shell">
      <div className="uo-customer-filter-bar">
      <input
        key={searchParams.get('search') ?? searchParams.get('q')}
        type="search"
        aria-label={`Search by ${labelFor('email').toLowerCase()}, ${labelFor('name').toLowerCase()}, or order reference`}
        placeholder={`Search by ${labelFor('email').toLowerCase()}, ${labelFor('name').toLowerCase()}, or order reference…`}
        defaultValue={searchParams.get('search') ?? searchParams.get('q') ?? ''}
        onChange={(e) => makeDebounced('search', 2)(e.target.value)}
        className="h-9 min-w-[280px] rounded-md px-3 text-[length:var(--uo-route-text-dense-size)] focus:outline-none"
        style={{ background: 'var(--uo-route-surface-primary)', border: '1px solid var(--uo-route-border-default)', color: 'var(--uo-route-text-primary)' }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--uo-route-border-strong)'; e.target.style.outline = '2px solid var(--uo-route-border-focus)'; e.target.style.outlineOffset = '2px'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--uo-route-border-default)'; e.target.style.outline = 'none'; }}
      />

      <Select
        aria-label="Sort customers"
        value={sortValue}
        onChange={(e) => updateParam('sort', e.target.value)}
      >
        {SORT_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>

      <Button type="button" variant="secondary" size="md" onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen}>
        <ListFilter size={14} aria-hidden="true" /> Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}
      </Button>

      {hasAnyFilter && (
        <Button onClick={handleClearAll} variant="secondary" size="md" className="gap-1">
          <X size={12} /> Clear
        </Button>
      )}
      </div>

      {(searchParams.get('risk') || searchParams.get('status')) ? (
        <div className="uo-customer-applied-filters" role="status" aria-label="Applied customer filters">
          <span>Applied</span>
          {searchParams.get('risk') ? <button type="button" onClick={() => updateParam('risk', '')}>{RISK_OPTIONS.find((option) => option.value === searchParams.get('risk'))?.label ?? searchParams.get('risk')} <X size={11} aria-hidden="true" /></button> : null}
          {searchParams.get('status') ? <button type="button" onClick={() => updateParam('status', '')}>{STATUS_OPTIONS.find((option) => option.value === searchParams.get('status'))?.label ?? searchParams.get('status')} <X size={11} aria-hidden="true" /></button> : null}
        </div>
      ) : null}

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter customers by operational context" width="min(420px, 100vw)" overlayId="customer-filter-drawer">
        <div className="uo-customer-filter-drawer">
          <section>
            <div><h3>Which records matter?</h3><p>Case signals describe recorded history; they do not assign responsibility.</p></div>
            <Select aria-label="Filter customers by case signal" value={searchParams.get('risk') ?? ''} onChange={(event) => updateParam('risk', event.target.value)}>
              {RISK_OPTIONS.map(({ value, label }) => <option key={value || 'all'} value={value}>{label}</option>)}
            </Select>
          </section>
          <section>
            <div><h3>Who needs attention now?</h3><p>Open cases are active work, separate from the customer’s full history.</p></div>
            <Select aria-label="Filter customers by status" value={searchParams.get('status') ?? ''} onChange={(event) => updateParam('status', event.target.value)}>
              {STATUS_OPTIONS.map(({ value, label }) => <option key={value || 'all'} value={value}>{label}</option>)}
            </Select>
          </section>
          <div className="uo-customer-filter-drawer__actions">
            {activeFilterCount ? <Button type="button" variant="secondary" onClick={handleClearAll}>Clear filters</Button> : null}
            <Button type="button" onClick={() => setFiltersOpen(false)}>Show customers</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
