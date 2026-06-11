'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CustomersFilterSheetInner } from '@/components/customers/CustomersFilterSheetInner';

const FILTER_FALLBACK = (
  <div className="h-10 w-full max-w-xl animate-pulse rounded-md" style={{ background: 'var(--bg-subtle)' }} />
);

function CustomersFilterSheetContent() {
  const searchParams = useSearchParams();
  return <CustomersFilterSheetInner searchParams={searchParams} />;
}

export default function CustomersFilterSheet() {
  return (
    <Suspense fallback={FILTER_FALLBACK}>
      <CustomersFilterSheetContent />
    </Suspense>
  );
}
