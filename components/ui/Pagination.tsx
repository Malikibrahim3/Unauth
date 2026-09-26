'use client';

import Link from '@/components/navigation/AppNavLink';

/**
 * The single pager control, always rendered so the footer is a constant
 * height regardless of result count. §7.3.
 */
export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Given a 1-indexed page number, returns the href for that page. Client callers may use this. */
  href?: (page: number) => string;
  /** Serializable hrefs for Server Component callers. */
  previousHref?: string;
  nextHref?: string;
}

export function Pagination({ page, pageSize, total, href, previousHref, nextHref }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const resultStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const resultEnd = Math.min(page * pageSize, total);
  const canPrevious = page > 1;
  const canNext = page < pageCount;
  const resolvedPreviousHref = canPrevious ? previousHref ?? href?.(page - 1) : undefined;
  const resolvedNextHref = canNext ? nextHref ?? href?.(page + 1) : undefined;

  return (
    <nav
      aria-label="Pagination"
      className="mt-3 flex h-8 items-center justify-between gap-3 text-[10.5px] text-[#64686d]"
    >
      <p>
        {total === 0 ? 'No results' : `Showing ${resultStart}–${resultEnd} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <PagerLink disabled={!canPrevious} href={resolvedPreviousHref} label="Previous page">
          Previous
        </PagerLink>
        <span aria-current="page">
          Page {page} of {pageCount}
        </span>
        <PagerLink disabled={!canNext} href={resolvedNextHref} label="Next page">
          Next
        </PagerLink>
      </div>
    </nav>
  );
}

function PagerLink({
  disabled,
  href,
  label,
  children,
}: {
  disabled: boolean;
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    'inline-flex h-8 items-center rounded-[8px] border border-[#e4e3e0] px-2.5 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f4f08]';
  if (disabled || !href) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={`${className} pointer-events-none border-[#eae8e5] text-[#6f6a63]`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${className} text-[#1c1f23] hover:bg-[#f3f0ed]`}
    >
      {children}
    </Link>
  );
}
