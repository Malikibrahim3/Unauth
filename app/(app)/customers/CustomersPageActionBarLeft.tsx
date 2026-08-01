'use client';

import { Suspense } from 'react';
import CustomersFilterSheet from '@/components/customers/CustomersFilterSheet';
import { Bone } from '@/components/ui/LoadingSkeleton';

const FILTER_FALLBACK = <Bone className="h-10 w-full max-w-xl" />;

export function CustomersPageActionBarLeft() {
  return (
    <Suspense fallback={FILTER_FALLBACK}>
      <CustomersFilterSheet />
    </Suspense>
  );
}
