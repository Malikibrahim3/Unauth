import Link from 'next/link';

const PAGE_SIZES = [25, 50, 100] as const;

function buildHref(pathname: string, searchParams: Record<string, string | undefined>, pageSize: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null || value === '') continue;
    if (key === 'page' || key === 'pageSize') continue;
    next.set(key, value);
  }
  next.set('pageSize', String(pageSize));
  return `${pathname}?${next.toString()}`;
}

export default function PageSizeSelect({
  pathname,
  searchParams,
  pageSize,
  label = 'Rows per page',
}: {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  pageSize: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
      <span>{label}</span>
      <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {PAGE_SIZES.map((size) => {
          const active = size === pageSize;
          return (
            <Link
              key={size}
              href={buildHref(pathname, searchParams, size)}
              className="px-2.5 py-1.5 font-semibold transition-colors"
              style={{
                background: active ? 'var(--text)' : 'var(--bg-surface)',
                color: active ? 'var(--text-inverse)' : 'var(--text-muted)',
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
