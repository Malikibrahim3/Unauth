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
    <div className="text-[11.5px] leading-[1.45] text-[#64686d] flex min-w-0 flex-wrap items-center gap-2">
      <span className="shrink-0">{label}</span>
      <div className="inline-flex shrink-0 overflow-hidden rounded-[8px] border" style={{ borderColor: '#e4e3e0', background: '#fff' }}>
        {PAGE_SIZES.map((size) => {
          const active = size === activePageSize;
          return (
            <Link
              key={size}
              href={buildHref(pathname, searchParams, size, pageSizeParam, pageParam)}
              scroll={false}
              className={`text-[11px] font-medium leading-4 text-[#64686d] inline-flex items-center px-2.5 transition-colors ${
                active
                  ? 'bg-[#fff] text-[#1c1f23] shadow-[inset_0_-2px_0_0_#9f4f08]'
                  : 'bg-[#fff] text-[#64686d] hover:bg-[#f3f0ed]'
              }`}
              style={{ height: 'calc(#40454a - 2px)' }}
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
    <Suspense fallback={<span className="text-[11.5px] leading-[1.45] text-[#64686d]">Rows per page…</span>}>
      <PageSizeSelectInner {...props} />
    </Suspense>
  );
}
