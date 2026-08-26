'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const PROFILE_TABS = new Set(['orders', 'cases', 'notes', 'activity', 'identity']);

export function CustomerProfileQueryFocus() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  useEffect(() => {
    if (!tab || !PROFILE_TABS.has(tab)) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(tab)?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tab]);

  return null;
}
