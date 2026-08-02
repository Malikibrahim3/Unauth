'use client';

import Link from 'next/link';

/**
 * The single pager control, always rendered so the footer is a constant
 * height regardless of result count. §7.3.
 */
export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Given a 1-indexed page number, returns the href for that page. */
  href: (page: number) => string;
}

export function Pagination({ page, pageSize, total, href }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const resultStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const resultEnd = Math.min(page * pageSize, total);
  const canPrevious = page > 1;
  const canNext = page < pageCount;

  return (
    <nav
      aria-label="Pagination"
      className="mt-3 flex h-[var(--ua-control-height-md)] items-center justify-between gap-3 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]"
    >
      <p>
        {total === 0 ? 'No results' : `Showing ${resultStart}–${resultEnd} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <PagerLink disabled={!canPrevious} href={canPrevious ? href(page - 1) : undefined} label="Previous page">
          Previous
        </PagerLink>
        <span aria-current="page">
          Page {page} of {pageCount}
        </span>
        <PagerLink disabled={!canNext} href={canNext ? href(page + 1) : undefined} label="Next page">
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
    'inline-flex h-[var(--ua-control-height-sm)] items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-control)] px-2.5 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ua-border-focus)]';
  if (disabled || !href) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={`${className} pointer-events-none border-[var(--ua-border-subtle)] text-[var(--ua-text-disabled)]`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${className} text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)]`}
    >
      {children}
    </Link>
  );
}
