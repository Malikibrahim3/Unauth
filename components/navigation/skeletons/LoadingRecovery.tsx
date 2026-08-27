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
    <div className="ua-route-loading-recovery" role="status" aria-live="polite">
      <div>
        <strong>{title} is taking longer than expected</strong>
        <p>No values have been assumed and no action has been taken. Retry this page, or leave by the safe workspace route.</p>
      </div>
      <div className="ua-route-loading-recovery__actions">
        <button type="button" className="ua-button ua-button--primary ua-button--md" onClick={() => window.location.reload()}>
          <RotateCcw size={14} aria-hidden="true" />
          <span>Retry this page</span>
        </button>
        <AppNavLink href={fallbackHref} className="ua-button ua-button--secondary ua-button--md">
          Go to Overview
        </AppNavLink>
      </div>
    </div>
  );
}
