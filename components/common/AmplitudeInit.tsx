'use client';

import { useRef } from 'react';
import { initAmplitude, identify } from '@/lib/analytics/amplitude';

interface Props {
  merchantId: string | null;
  accountTier?: string | null;
  storeName?: string | null;
  monthlyOrderVolume?: string | number | null;
  primaryConcern?: string | null;
}

let amplitudeInitialized = false;

function ensureAmplitudeInitialized() {
  if (!amplitudeInitialized) {
    initAmplitude();
    amplitudeInitialized = true;
  }
}

export default function AmplitudeInit({
  merchantId,
  accountTier,
}: Props) {
  const identifiedRef = useRef<string | null>(null);
  ensureAmplitudeInitialized();

  const identifyKey = merchantId ? `${merchantId}:${accountTier ?? ''}` : null;
  if (identifyKey && identifiedRef.current !== identifyKey) {
    identifiedRef.current = identifyKey;
    identify(merchantId!, {
      accountTier: accountTier ?? undefined,
    });
  }

  return null;
}
