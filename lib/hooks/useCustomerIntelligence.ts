'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CustomerIntelligence } from '@/types/customer';
import { adaptCustomerIntelligence } from '@/lib/adapters/customer';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';

interface UseCustomerIntelligenceResult {
  data: CustomerIntelligence | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Shared hook used by BOTH the Customer Drawer and the Full Customer Page.
 * Guarantees both views consume the same data shape and the same endpoint.
 */
export function useCustomerIntelligence(profileId: string | null): UseCustomerIntelligenceResult {
  const [data, setData] = useState<CustomerIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!profileId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/customers/${encodeURIComponent(profileId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CustomerIntelligencePanel>;
      })
      .then((panel) => {
        if (cancelled) return;
        setData(adaptCustomerIntelligence(panel));
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [profileId, tick]);

  return { data, loading, error, refetch };
}
