'use client';

import { useEffect } from 'react';
import { initAmplitude, identify } from '@/lib/analytics/amplitude';

interface Props {
  merchantId: string | null;
  storeName?: string | null;
  monthlyOrderVolume?: string | null;
  primaryConcern?: string | null;
}

export default function AmplitudeInit({
  merchantId,
  storeName,
  monthlyOrderVolume,
  primaryConcern,
}: Props) {
  useEffect(() => {
    initAmplitude();
    if (merchantId) {
      identify(merchantId, {
        storeName: storeName ?? undefined,
        monthlyOrderVolume: monthlyOrderVolume ?? undefined,
        primaryConcern: primaryConcern ?? undefined,
      });
    }
  }, [merchantId, storeName, monthlyOrderVolume, primaryConcern]);

  return null;
}
