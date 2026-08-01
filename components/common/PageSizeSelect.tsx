'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const PAGE_SIZES = [25, 50, 100] as const;

function buildHref(
  pathname: string,
  searchParams: URLSearchParams,
  pageSize: number,
  pageSizeParam: string,
  pageParam: string,
) {
  const next = new URLSearchParams(searchParams.toString());
  next.delete(pageParam);
  next.set(pageSizeParam, String(pageSize));
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function PageSizeSelectInner({
  pathname,
  pageSize,
  label = 'Rows per page',
  pageSizeParam = 'pageSize',
  pageParam = 'page',
}: {
  pathname: string;
  pageSize: number;
  label?: string;
  pageSizeParam?: string;
  pageParam?: string;
}) {
  const searchParams = useSearchParams();
  const activePageSize =
    Number.parseInt(searchParams.get(pageSizeParam) ?? String(pageSize), 10) || pageSize;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
      <span className="shrink-0">{label}</span>
      <div className="inline-flex shrink-0 overflow-hidden rounded-[var(--ua-radius-control)] border" style={{ borderColor: 'var(--ua-border-control)', background: 'var(--ua-surface-primary)' }}>
        {PAGE_SIZES.map((size) => {
          const active = size === activePageSize;
          return (
            <Link
              key={size}
              href={buildHref(pathname, searchParams, size, pageSizeParam, pageParam)}
              scroll={false}
              className={`inline-flex items-center px-2.5 font-semibold transition-colors ${
                active
                  ? 'bg-[var(--ua-accent-100)] text-[var(--ua-accent-800)]'
                  : 'bg-[var(--ua-surface-primary)] text-[var(--ua-text-secondary)] hover:bg-[var(--ua-surface-hover)]'
              }`}
              style={{ height: 'calc(var(--ua-control-height-md) - 2px)' }}
              aria-current={active ? 'page' : undefined}
            >
              {size}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function PageSizeSelect(props: {
  pathname: string;
  pageSize: number;
  label?: string;
  pageSizeParam?: string;
  pageParam?: string;
}) {
  return (
    <Suspense fallback={<span className="text-xs" style={{ color: 'var(--ua-text-secondary)' }}>Rows per page…</span>}>
      <PageSizeSelectInner {...props} />
    </Suspense>
  );
}
