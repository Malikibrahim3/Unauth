"use client";

import { useEffect } from "react";

interface Props {
  merchantId: string | null;
  accountTier?: string | null;
  storeName?: string | null;
  monthlyOrderVolume?: string | number | null;
  primaryConcern?: string | null;
}

export default function AmplitudeInit({ merchantId, accountTier }: Props) {
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { initAmplitude, identify } = await import("@/lib/analytics/amplitude");
      if (cancelled) return;
      initAmplitude();
      if (merchantId) identify(merchantId, { accountTier: accountTier ?? undefined });
    }, 1_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [accountTier, merchantId]);

  return null;
}
