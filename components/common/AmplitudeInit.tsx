'use client';

import { useEffect } from 'react';
import { initAmplitude, identify } from '@/lib/analytics/amplitude';

interface Props {
  merchantId: string | null;
  accountTier?: string | null;
  storeName?: string | null;
  monthlyOrderVolume?: string | number | null;
  primaryConcern?: string | null;
}

export default function AmplitudeInit({
  merchantId,
  accountTier,
}: Props) {
  useEffect(() => {
    initAmplitude();
    if (merchantId) {
      identify(merchantId, {
        accountTier: accountTier ?? undefined,
      });
    }
  }, [merchantId, accountTier]);

  return null;
}
