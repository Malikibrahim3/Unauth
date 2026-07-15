'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

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
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <span className="shrink-0">{label}</span>
      <SegmentedControl
        aria-label="Rows per page"
        value={String(activePageSize)}
        items={PAGE_SIZES.map((size) => ({
          value: String(size),
          label: size,
          href: buildHref(pathname, searchParams, size, pageSizeParam, pageParam),
        }))}
      />
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
    <Suspense fallback={<span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Rows per page…</span>}>
      <PageSizeSelectInner {...props} />
    </Suspense>
  );
}
