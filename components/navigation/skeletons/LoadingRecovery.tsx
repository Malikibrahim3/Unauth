'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import AppNavLink from '@/components/navigation/AppNavLink';
import { DELAY } from '@/lib/design/motion';

export function LoadingRecovery({
  title,
  fallbackHref = '/overview',
}: {
  title: string;
  fallbackHref?: string;
}) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), DELAY.slowLoadNotice);
    return () => window.clearTimeout(timer);
  }, []);

  if (!slow) return null;

  return (
    <div className="grid min-h-[220px] place-items-center gap-3 rounded-xl border border-[#e4e3e0] bg-white p-6 text-center" role="status" aria-live="polite">
      <div>
        <strong>{title} is taking longer than expected</strong>
        <p>No values have been assumed and no action has been taken. Retry this page, or leave by the safe workspace route.</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border font-medium no-underline bg-[#1c1f23] text-white border-[#1c1f23] h-9 px-3.5 text-[12.5px]" onClick={() => window.location.reload()}>
          <RotateCcw size={14} aria-hidden="true" />
          <span>Retry this page</span>
        </button>
        <AppNavLink href={fallbackHref} className="inline-flex items-center justify-center gap-2 rounded-lg border font-medium no-underline bg-white text-[#40454a] border-[#d8d4cf] h-9 px-3.5 text-[12.5px]">
          Go to Overview
        </AppNavLink>
      </div>
    </div>
  );
}
