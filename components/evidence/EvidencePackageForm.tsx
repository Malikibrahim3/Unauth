'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OrderOption {
  id: string;
  order_id: string;
  processed_at: string;
  order_value: number | null;
  refund_claimed: boolean;
}

export interface EvidencePackageFormProps {
  profileId: string;
  preselectedOrderId?: string;
  showIntro?: boolean;
  onCancel?: () => void;
  /** When set, navigates to chargebacks detail after success (default). Pass no-op to handle externally. */
  onSuccess?: (packageId: string) => void;
}

export function EvidencePackageForm({
  profileId,
  preselectedOrderId = '',
  showIntro = true,
  onCancel,
  onSuccess,
}: EvidencePackageFormProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState(preselectedOrderId);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState('');
  const [priorMatchPreview, setPriorMatchPreview] = useState<'unknown' | 'likely' | 'unlikely'>('unknown');
  const [priorMatchChecking, setPriorMatchChecking] = useState(false);

  useEffect(() => {
    setSelectedOrderId(preselectedOrderId);
  }, [preselectedOrderId]);

  useEffect(() => {
    fetch(`/api/customers/${profileId}/orders`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { orders?: OrderOption[] } | null) => {
        if (data?.orders) {
          setOrders(data.orders);
          if (!preselectedOrderId && data.orders.length > 0) {
            setSelectedOrderId(data.orders[data.orders.length - 1].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [profileId, preselectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId) {
      setPriorMatchPreview('unknown');
      return;
    }
    setPriorMatchChecking(true);
    fetch(`/api/evidence/ce3-check?profileId=${profileId}&orderId=${selectedOrderId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { hasPriorMatchEvidence?: boolean } | null) => {
        if (data?.hasPriorMatchEvidence === true) setPriorMatchPreview('likely');
        else if (data?.hasPriorMatchEvidence === false) setPriorMatchPreview('unlikely');
        else setPriorMatchPreview('unknown');
      })
      .catch(() => setPriorMatchPreview('unknown'))
      .finally(() => setPriorMatchChecking(false));
  }, [selectedOrderId, profileId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrderId) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerProfileId: profileId,
          disputedOrderId: selectedOrderId,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? 'Failed to compile signal data');
        return;
      }
      const { packageId } = await res.json();
      if (onSuccess) {
        onSuccess(packageId);
      } else {
        router.push(`/chargebacks/${packageId}`);
      }
    } catch {
      setError('Failed to compile signal data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const hasEligibleOrders = orders.some((o) => o.refund_claimed);
  const canSubmit = !!selectedOrderId && !loading && !loadingOrders;

  const packageIncludes = [
    { label: 'Customer identity record', available: true },
    { label: 'Order history (all known orders)', available: true },
    { label: 'Identity signals observed', available: true },
    {
      label: 'Prior matching transactions (if any)',
      available: priorMatchPreview === 'likely',
      pending: priorMatchPreview === 'unknown',
    },
    { label: 'Merchant notes', available: !!notes.trim(), optional: true },
  ];

  const cancelControl = onCancel ? (
    <button type="button" onClick={onCancel} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
      Cancel
    </button>
  ) : (
    <Link href={`/customers/${profileId}`} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
      ← Cancel
    </Link>
  );

  return (
    <div className={showIntro ? 'p-8 max-w-2xl mx-auto' : 'px-[var(--space-5)] py-[var(--space-4)]'}>
      {showIntro && (
        <>
          <h1 className="text-heading-lg mb-1" style={{ color: 'var(--text)' }}>
            Build evidence package
          </h1>
          <p className="text-body-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Organises identity signal data from your records that may be relevant when preparing a chargeback
            response. Unauth surfaces the signal history — your payment processor or acquirer determines what
            qualifies as valid dispute evidence.
          </p>
          <p
            className="text-caption mb-8 rounded-md border px-3 py-2"
            style={{ color: 'var(--text-subtle)', borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}
          >
            This export presents identity match data for your review. How you use it in a dispute is at your
            discretion — follow your acquirer or processor guidelines.
          </p>
        </>
      )}

      {!showIntro && (
        <p className="text-body-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Select the disputed order and optional notes. Unauth compiles identity signal data for your review.
        </p>
      )}

      {loadingOrders && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
        >
          <div
            className="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
          />
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
            Loading order history…
          </p>
        </div>
      )}

      {!loadingOrders && orders.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-heading-sm mb-2" style={{ color: 'var(--text)' }}>
            No orders found
          </p>
          <p className="text-body-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            This customer has no order history in the current dataset. Evidence packages require at least one order.
          </p>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>
              Close
            </button>
          ) : (
            <Link href={`/customers/${profileId}`} className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>
              ← Return to profile
            </Link>
          )}
        </div>
      )}

      {!loadingOrders && orders.length > 0 && !hasEligibleOrders && (
        <div
          className="mb-6 flex items-start gap-3 rounded-lg p-4"
          style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-bd)' }}
        >
          <span style={{ color: 'var(--warning)' }}>⚠</span>
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
              No refund claims or chargebacks on record
            </p>
            <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
              Signal data is most complete when a refund claim is on record. You can still compile a signal report for
              any order.
            </p>
          </div>
        </div>
      )}

      {!loadingOrders && orders.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }} htmlFor="order-select">
              Disputed order *
            </label>
            <select
              id="order-select"
              data-testid="disputed-order-select"
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              required
            >
              <option value="">Select an order to defend…</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_id} · {new Date(o.processed_at).toLocaleDateString('en-US')}
                  {o.order_value != null ? ` · ${o.order_value.toFixed(2)}` : ''}
                  {o.refund_claimed ? ' ★ refund claimed' : ''}
                </option>
              ))}
            </select>
            {!selectedOrderId && (
              <p className="text-caption mt-1.5" style={{ color: 'var(--text-subtle)' }}>
                Select the order the customer has disputed. Orders marked ★ have a refund claim on record.
              </p>
            )}
          </div>

          {selectedOrderId && (
            <div>
              {priorMatchChecking ? (
                <div
                  className="flex items-center gap-2 rounded-lg p-3"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
                >
                  <div
                    className="h-3 w-3 animate-spin rounded-full border border-t-transparent"
                    style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
                  />
                  <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                    Checking for prior identity matches…
                  </p>
                </div>
              ) : priorMatchPreview === 'likely' ? (
                <div
                  className="flex items-start gap-2.5 rounded-lg p-3"
                  style={{ background: 'var(--success-bg)', border: '1px solid var(--success-bd)' }}
                >
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      Prior matching transactions found
                    </p>
                    <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      This customer has prior orders in your records that share identity signals with the selected
                      order.
                    </p>
                  </div>
                </div>
              ) : priorMatchPreview === 'unlikely' ? (
                <div
                  className="flex items-start gap-2.5 rounded-lg p-3"
                  style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-bd)' }}
                >
                  <span style={{ color: 'var(--warning)' }}>⚠</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      No prior matching transactions detected
                    </p>
                    <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      No prior transactions with matching signals were found in your records for this customer.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {selectedOrderId && (
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
              <p className="mb-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                This package will include
              </p>
              <ul className="space-y-1.5">
                {packageIncludes.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-caption">
                    {item.pending ? (
                      <span style={{ color: 'var(--text-subtle)' }}>○</span>
                    ) : item.available ? (
                      <span style={{ color: 'var(--success)' }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--border)' }}>–</span>
                    )}
                    <span style={{ color: item.available ? 'var(--text)' : 'var(--text-subtle)' }}>
                      {item.label}
                      {item.optional && !item.available && (
                        <span className="ml-1" style={{ color: 'var(--text-subtle)' }}>
                          (add notes below)
                        </span>
                      )}
                      {item.pending && (
                        <span className="ml-1" style={{ color: 'var(--text-subtle)' }}>
                          (checking…)
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }} htmlFor="notes">
              Merchant note{' '}
              <span className="font-normal" style={{ color: 'var(--text-subtle)' }}>
                (optional · appears in the package · max 500 characters)
              </span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Any additional context to include in the evidence package…"
              className="w-full resize-none rounded-md px-3 py-2 text-sm"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
            <p className="text-caption mt-1 text-right" style={{ color: 'var(--text-subtle)' }}>
              {notes.length}/500
            </p>
          </div>

          {error && (
            <div
              className="rounded-md border p-3 text-sm"
              style={{
                background: 'var(--risk-critical-bg)',
                borderColor: 'var(--risk-critical-bd)',
                color: 'var(--risk-critical)',
              }}
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {cancelControl}
            <div className="flex flex-col items-end gap-1">
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-md px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {loading ? 'Building…' : 'Build evidence package'}
              </button>
              {!selectedOrderId && (
                <p className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>
                  Select an order above to continue
                </p>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
