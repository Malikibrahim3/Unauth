'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ShopifyStatus } from '@/components/shopify/syncStatusCardTypes';

export function useSyncStatusCard() {
  const [status, setStatus] = useState<ShopifyStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadStatus = useCallback(() => {
    return fetch('/api/shopify/status', { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStatus(d);
        return d;
      })
      .catch(() => null);
  }, []);

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      console.log('[shopify] POST /api/shopify/sync-audit');
      const res = await fetch('/api/shopify/sync-audit', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const text = await res.text();
      let body: { error?: string } | null = null;
      try {
        body = text ? (JSON.parse(text) as { error?: string }) : null;
      } catch {
        console.error('[shopify] sync non-JSON response:', res.status, text.slice(0, 200));
        setSyncError(`Sync failed (${res.status}). The API may not be deployed yet.`);
        return;
      }
      if (!res.ok) {
        console.warn('[shopify] sync failed:', res.status, body);
        setSyncError(body?.error ?? `Sync failed (${res.status}). Try again or reconnect Shopify.`);
        return;
      }
      console.log('[shopify] sync ok:', body);
      await loadStatus();
    } catch (err) {
      console.error('[shopify] sync-audit request error:', err);
      setSyncError('Sync failed. Check your connection and try again.');
    } finally {
      setSyncing(false);
    }
  }, [loadStatus]);

  useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('shopify_connected') === '1') {
      const timers = [300, 3000, 12000, 30000].map((ms) => window.setTimeout(() => loadStatus(), ms));
      return () => timers.forEach((id) => window.clearTimeout(id));
    }
    return undefined;
  }, [loadStatus]);

  return {
    status,
    modalOpen,
    setModalOpen,
    syncing,
    syncError,
    handleSyncNow,
  };
}
