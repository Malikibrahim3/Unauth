'use client';

import { Suspense, useCallback, useRef, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

interface WatchlistSearchInputProps {
  defaultValue?: string;
}

function WatchlistSearchInputInner({ defaultValue = '' }: WatchlistSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncQueryToUrl = useCallback(
    (nextValue: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (nextValue.trim()) {
          params.set('q', nextValue.trim());
        } else {
          params.delete('q');
        }
        params.delete('page');
        startTransition(() => {
          router.replace(`${pathname}?${params.toString()}`);
        });
      }, 250);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
        style={{ color: 'var(--text-muted)' }}
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          const nextValue = e.target.value;
          setValue(nextValue);
          syncQueryToUrl(nextValue);
        }}
        placeholder="Search by name or email…"
        className="rounded-md border pl-8 pr-3 py-1.5 text-sm outline-none transition-colors focus:ring-1"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
          width: 220,
          // @ts-expect-error CSS variable
          '--tw-ring-color': 'var(--accent-500)',
        }}
        aria-label="Search watchlist"
      />
    </div>
  );
}

export default function WatchlistSearchInput(props: WatchlistSearchInputProps) {
  return (
    <Suspense
      fallback={
        <div
          className="rounded-md border pl-8 pr-3 py-1.5 text-sm"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', width: 220, color: 'var(--text-muted)' }}
        >
          Search…
        </div>
      }
    >
      <WatchlistSearchInputInner {...props} />
    </Suspense>
  );
}
