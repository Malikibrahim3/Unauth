'use client';

import { Suspense } from 'react';
import { SidebarInner, type SidebarProps } from '@/components/nav/SidebarInner';

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={<div className="hidden md:block w-16 shrink-0" aria-hidden="true" />}>
      <SidebarInner {...props} />
    </Suspense>
  );
}
