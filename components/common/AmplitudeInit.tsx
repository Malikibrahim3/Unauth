"use client";

import { useEffect } from "react";
import { initAmplitude, identify } from "@/lib/analytics/amplitude";

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

export default function AmplitudeInit({ merchantId, accountTier }: Props) {
  useEffect(() => {
    ensureAmplitudeInitialized();
    if (!merchantId) return;
    identify(merchantId, { accountTier: accountTier ?? undefined });
  }, [accountTier, merchantId]);

  return null;
}
