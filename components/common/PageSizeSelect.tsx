'use client';

import Link from 'next/link';
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

export default function PageSizeSelect({
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
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
      <span className="shrink-0">{label}</span>
      <div className="inline-flex shrink-0 overflow-hidden rounded-[4px] border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
        {PAGE_SIZES.map((size) => {
          const active = size === activePageSize;
          return (
            <Link
              key={size}
              href={buildHref(pathname, searchParams, size, pageSizeParam, pageParam)}
              scroll={false}
              className="px-2.5 py-1.5 font-semibold transition-colors"
              style={{
                background: active ? 'var(--brand-ink)' : 'var(--bg-surface)',
                color: active ? 'var(--brand-paper)' : 'var(--text-muted)',
                boxShadow: active ? 'inset 0 0 0 1px rgba(26,24,20,0.08)' : undefined,
              }}
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
