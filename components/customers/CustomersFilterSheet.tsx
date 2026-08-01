'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CustomersFilterSheetInner } from '@/components/customers/CustomersFilterSheetInner';
import { Bone } from '@/components/ui/LoadingSkeleton';

const FILTER_FALLBACK = <Bone className="h-10 w-full max-w-xl" />;

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
