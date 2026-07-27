'use client';

import { useRouter, type ReadonlyURLSearchParams } from 'next/navigation';
import { useCallback, useTransition, useRef } from 'react';
import { X } from 'lucide-react';
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

const SORT_OPTIONS = [
  { value: 'recent', label: 'Sort: Most recent order' },
  { value: 'orders', label: 'Sort: Most orders' },
  { value: 'cases', label: 'Sort: Most cases' },
  { value: 'name', label: 'Sort: Name A–Z' },
] as const;

export function CustomersFilterSheetInner({
  searchParams,
}: {
  searchParams: ReadonlyURLSearchParams;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

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

  const currentSort = searchParams.get('sort') ?? 'recent';
  const sortValue = SORT_OPTIONS.some((o) => o.value === currentSort) ? currentSort : 'recent';

  return (
    <div className="grid w-full grid-cols-1 gap-2 xl:grid-cols-[minmax(300px,1fr)_220px_auto]">
      <input
        key={searchParams.get('q')}
        type="search"
        aria-label={`Search by ${labelFor('email').toLowerCase()}, ${labelFor('name').toLowerCase()}, or order reference`}
        placeholder={`Search by ${labelFor('email').toLowerCase()}, ${labelFor('name').toLowerCase()}, or order reference…`}
        defaultValue={searchParams.get('q') ?? ''}
        onChange={(e) => makeDebounced('q', 2)(e.target.value)}
        className="h-9 min-w-[280px] rounded-md px-3 text-[length:var(--ua-text-dense-size)] focus:outline-none"
        style={{ background: 'var(--ua-surface-primary)', border: '1px solid var(--ua-border-default)', color: 'var(--ua-text-primary)' }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--ua-border-strong)'; e.target.style.outline = '2px solid var(--ua-border-focus)'; e.target.style.outlineOffset = '2px'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--ua-border-default)'; e.target.style.outline = 'none'; }}
      />

      <select
        aria-label="Sort customers"
        value={sortValue}
        onChange={(e) => updateParam('sort', e.target.value)}
        className="h-9 rounded-md px-3 text-[length:var(--ua-text-dense-size)] focus:outline-none"
        style={{ background: 'var(--ua-surface-primary)', border: '1px solid var(--ua-border-default)', color: 'var(--ua-text-primary)' }}
      >
        {SORT_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {hasAnyFilter && (
        <Button onClick={handleClearAll} variant="secondary" size="md" className="gap-1">
          <X size={12} /> Clear
        </Button>
      )}
    </div>
  );
}
