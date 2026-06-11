'use client';

import { Suspense, useMemo } from 'react';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { ButtonLink } from '@/components/ui/ButtonLink';

type HistoryPageActionBarProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  baseSearchParams: Record<string, string>;
};

export function HistoryPageActionBarLeft({ pageSize }: { pageSize: number }) {
  return (
    <Suspense fallback={<span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Rows per page…</span>}>
      <PageSizeSelect pathname="/history" pageSize={pageSize} />
    </Suspense>
  );
}

export function HistoryPageActionBarRight({
  page,
  totalPages,
  pageSize,
  baseSearchParams,
}: HistoryPageActionBarProps) {
  const pagination = useMemo(() => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Page {page} of {totalPages}</span>
        {page > 1 ? (
          <ButtonLink
            href={`/history?${new URLSearchParams({ ...baseSearchParams, page: String(page - 1), pageSize: String(pageSize) }).toString()}`}
            variant="secondary"
            size="sm"
          >
            Prev
          </ButtonLink>
        ) : null}
        {page < totalPages ? (
          <ButtonLink
            href={`/history?${new URLSearchParams({ ...baseSearchParams, page: String(page + 1), pageSize: String(pageSize) }).toString()}`}
            variant="secondary"
            size="sm"
          >
            Next
          </ButtonLink>
        ) : null}
      </div>
    );
  }, [baseSearchParams, page, pageSize, totalPages]);

  return pagination;
}
