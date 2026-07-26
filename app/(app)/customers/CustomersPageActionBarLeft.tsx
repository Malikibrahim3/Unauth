'use client';

import { Suspense } from 'react';
import CustomersFilterSheet from '@/components/customers/CustomersFilterSheet';

const FILTER_FALLBACK = (
  <div className="h-10 w-full max-w-xl animate-pulse rounded-md" style={{ background: 'var(--ua-surface-secondary)' }} />
);

export function CustomersPageActionBarLeft() {
  return (
    <Suspense fallback={FILTER_FALLBACK}>
      <CustomersFilterSheet />
    </Suspense>
  );
}
