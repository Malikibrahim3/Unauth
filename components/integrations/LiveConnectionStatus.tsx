'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const VERIFY_PATHS: Record<string, string> = {
  gorgias: '/api/settings/gorgias/support-connection/verify',
  shopify: '/api/shopify/verify',
};

type DisplayStatus = 'connected' | 'error' | 'attention_required' | string;

export function LiveConnectionStatus({
  provider,
  initialStatus,
}: {
  provider: string;
  initialStatus: DisplayStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const verifyPath = VERIFY_PATHS[provider];

  const verify = useCallback(async () => {
    if (!verifyPath || document.visibilityState !== 'visible') return;
    try {
      const response = await fetch(verifyPath, { cache: 'no-store' });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        inconclusive?: boolean;
      };
      setStatus(body.ok === true ? 'connected' : body.inconclusive || response.status >= 500 ? 'attention_required' : 'error');
    } catch {
      setStatus('attention_required');
    }
  }, [verifyPath]);

  useEffect(() => {
    if (!verifyPath) return;
    const interval = window.setInterval(verify, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void verify();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [verify, verifyPath]);

  return <StatusBadge family="workflowStatus" value={status === 'import_complete' ? 'connected' : status} />;
}
