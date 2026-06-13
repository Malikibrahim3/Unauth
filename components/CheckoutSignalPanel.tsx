'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed } from 'lucide-react';

type CheckoutSignalSummary = {
  hasPreOrderSignals: boolean;
  visitorId: string | null;
  deviceFp: string | null;
  checkoutReached: boolean;
  emailCaptured: boolean;
  accountType: 'guest' | 'registered' | 'unknown';
  crossMerchantDeviceHits: number;
  sameVisitorOtherOrders: number;
  sameDeviceOtherMerchants: number;
  firstSignalAt: string | null;
};

type SignalFact = {
  active: boolean;
  title: string;
  detail: string;
};

export function CheckoutSignalPanel({
  orderId,
  merchantId: _merchantId,
}: {
  orderId: string;
  merchantId: string;
}) {
  const [summary, setSummary] = useState<CheckoutSignalSummary | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(`/api/orders/${encodeURIComponent(orderId)}/checkout-signals`, {
      credentials: 'same-origin',
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('request_failed'))))
      .then((data) => {
        if (!cancelled) {
          setSummary(data as CheckoutSignalSummary);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const facts = useMemo<SignalFact[]>(() => {
    if (!summary) return [];
    return [
      {
        active: Boolean(summary.deviceFp),
        title: 'Device seen before this order',
        detail: summary.sameDeviceOtherMerchants > 0
          ? `Same device appeared at ${summary.sameDeviceOtherMerchants} other merchant${summary.sameDeviceOtherMerchants === 1 ? '' : 's'}`
          : 'Device fingerprint captured before order creation',
      },
      {
        active: Boolean(summary.visitorId),
        title: 'Visitor recognised',
        detail: summary.sameVisitorOtherOrders > 0
          ? `This visitor has placed ${summary.sameVisitorOtherOrders} previous order${summary.sameVisitorOtherOrders === 1 ? '' : 's'}`
          : 'First linked order for this visitor',
      },
      {
        active: summary.emailCaptured,
        title: 'Email captured at checkout',
        detail: 'Matches identity on file',
      },
      {
        active: summary.checkoutReached,
        title: 'Checkout reached',
        detail: summary.accountType === 'registered'
          ? 'Registered account context'
          : summary.accountType === 'guest'
            ? 'Guest checkout context'
            : 'Account context unavailable',
      },
    ];
  }, [summary]);

  return (
    <section
      className="rounded-md border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-sm">Pre-order signals</h2>
          {summary?.firstSignalAt && (
            <p className="mt-1 text-caption" style={{ color: 'var(--text-secondary)' }}>
              First seen {new Date(summary.firstSignalAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {status === 'loading' && (
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading pre-order signals...
        </p>
      )}

      {status === 'error' && (
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          Pre-order signals are unavailable right now.
        </p>
      )}

      {status === 'ready' && !summary?.hasPreOrderSignals && (
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          No pre-order signals linked to this order yet.
        </p>
      )}

      {status === 'ready' && summary?.hasPreOrderSignals && (
        <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
          {facts.map((fact) => {
            const Icon = fact.active ? CheckCircle2 : CircleDashed;
            return (
              <div key={fact.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                  style={{ color: fact.active ? 'var(--accent)' : 'var(--text-tertiary)' }}
                />
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {fact.title}
                  </p>
                  <p className="mt-1 text-caption" style={{ color: 'var(--text-secondary)' }}>
                    {fact.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
