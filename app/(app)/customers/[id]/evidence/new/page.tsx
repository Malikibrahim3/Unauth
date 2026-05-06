'use client'
// app/(app)/customers/[id]/evidence/new/page.tsx
// Generate a chargeback evidence package for a customer.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: { id: string }
  searchParams: { disputedOrder?: string }
}

interface OrderOption {
  id: string
  order_id: string
  processed_at: string
  order_value: number | null
  refund_claimed: boolean
}

export default function EvidenceNewPage({ params, searchParams }: PageProps) {
  const router = useRouter()
  const profileId = params.id
  const preselectedOrder = searchParams.disputedOrder ?? ''

  const [orders, setOrders] = useState<OrderOption[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState(preselectedOrder)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [error, setError] = useState('')
  const [ce3Preview, setCe3Preview] = useState<'unknown' | 'likely' | 'unlikely'>('unknown')
  const [ce3Checking, setCe3Checking] = useState(false)

  // Load orders for this customer profile
  useEffect(() => {
    fetch(`/api/customers/${profileId}/orders`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { orders?: OrderOption[] } | null) => {
        if (data?.orders) {
          setOrders(data.orders)
          // Auto-select most recent order if none preselected
          if (!preselectedOrder && data.orders.length > 0) {
            setSelectedOrderId(data.orders[data.orders.length - 1].id)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false))
  }, [profileId, preselectedOrder])

  // CE3.0 pre-assessment when order changes
  useEffect(() => {
    if (!selectedOrderId) { setCe3Preview('unknown'); return }
    setCe3Checking(true)
    fetch(`/api/evidence/ce3-check?profileId=${profileId}&orderId=${selectedOrderId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { eligible?: boolean } | null) => {
        if (data?.eligible === true) setCe3Preview('likely')
        else if (data?.eligible === false) setCe3Preview('unlikely')
        else setCe3Preview('unknown')
      })
      .catch(() => setCe3Preview('unknown'))
      .finally(() => setCe3Checking(false))
  }, [selectedOrderId, profileId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedOrderId) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerProfileId: profileId,
          disputedOrderId: selectedOrderId,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Failed to generate evidence package')
        return
      }
      const { packageId } = await res.json()
      router.push(`/chargebacks/${packageId}`)
    } catch {
      setError('Failed to generate evidence package. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const _selectedOrder = orders.find(o => o.id === selectedOrderId)
  const hasEligibleOrders = orders.some(o => o.refund_claimed)
  const canSubmit = !!selectedOrderId && !loading && !loadingOrders

  // Package preview checklist (dynamic, based on selected order)
  const packageIncludes = [
    { label: 'Customer identity record', available: true },
    { label: 'Order history (all known orders)', available: true },
    { label: 'Identity signals & risk flags', available: true },
    { label: 'CE3.0 qualifying prior transactions', available: ce3Preview === 'likely', pending: ce3Preview === 'unknown' },
    { label: 'Merchant notes', available: !!notes.trim(), optional: true },
  ]

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Back navigation */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/customers/${profileId}`}
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back to Profile
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <Link href="/customers" className="text-sm hover:opacity-80 transition-colors" style={{ color: 'var(--text-muted)' }}>Customers</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm" style={{ color: 'var(--text)' }}>Generate evidence</span>
      </div>

      <h1 className="text-heading-lg mb-1" style={{ color: 'var(--text)' }}>
        Generate chargeback evidence
      </h1>
      <p className="text-body-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        Creates a submission-ready document for your payment processor. Where eligible, the package is automatically formatted for Visa Compelling Evidence 3.0.
      </p>

      {/* Loading state */}
      {loadingOrders && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
          <div className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mb-3" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>Loading order history…</p>
        </div>
      )}

      {/* No orders state */}
      {!loadingOrders && orders.length === 0 && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-heading-sm mb-2" style={{ color: 'var(--text)' }}>No orders found</p>
          <p className="text-body-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            This customer has no order history in the current dataset. Evidence packages require at least one order.
          </p>
          <Link
            href={`/customers/${profileId}`}
            className="text-sm hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            ← Return to profile
          </Link>
        </div>
      )}

      {/* No eligible orders warning */}
      {!loadingOrders && orders.length > 0 && !hasEligibleOrders && (
        <div className="rounded-lg p-4 mb-6 flex items-start gap-3" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-bd)' }}>
          <span style={{ color: 'var(--warning)' }}>⚠</span>
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>No refund claims or chargebacks on record</p>
            <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
              Evidence packages are most effective when defending a disputed order with a refund claim. You can still generate a package, but it may carry less weight.
            </p>
          </div>
        </div>
      )}

      {/* Main form */}
      {!loadingOrders && orders.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order select */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: 'var(--text-muted)' }}
              htmlFor="order-select"
            >
              Disputed order *
            </label>
            <select
              id="order-select"
              value={selectedOrderId}
              onChange={e => setSelectedOrderId(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              required
            >
              <option value="">Select an order to defend…</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.order_id} · {new Date(o.processed_at).toLocaleDateString('en-GB')}
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

          {/* CE3.0 eligibility banner */}
          {selectedOrderId && (
            <div>
              {ce3Checking ? (
                <div className="rounded-lg p-3 flex items-center gap-2" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                  <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                  <p className="text-caption" style={{ color: 'var(--text-muted)' }}>Checking CE3.0 eligibility…</p>
                </div>
              ) : ce3Preview === 'likely' ? (
                <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-bd)' }}>
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>CE3.0 eligible</p>
                    <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      A qualifying prior transaction history was found. The package will be formatted for Visa Compelling Evidence 3.0.
                    </p>
                  </div>
                </div>
              ) : ce3Preview === 'unlikely' ? (
                <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-bd)' }}>
                  <span style={{ color: 'var(--warning)' }}>⚠</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>CE3.0 requirements may not be met</p>
                    <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      No qualifying prior transactions detected. The package will use standard representment format instead.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Package preview */}
          {selectedOrderId && (
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>This package will include</p>
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
                    <span style={{ color: item.available ? 'var(--text)' : item.pending ? 'var(--text-subtle)' : 'var(--text-subtle)' }}>
                      {item.label}
                      {item.optional && !item.available && <span className="ml-1" style={{ color: 'var(--text-subtle)' }}>(add notes below)</span>}
                      {item.pending && <span className="ml-1" style={{ color: 'var(--text-subtle)' }}>(checking…)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: 'var(--text-muted)' }}
              htmlFor="notes"
            >
              Merchant note{' '}
              <span className="font-normal" style={{ color: 'var(--text-subtle)' }}>
                (optional · appears in the package · max 500 characters)
              </span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Any additional context to include in the evidence package…"
              className="w-full px-3 py-2 rounded-md text-sm resize-none"
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
              className="p-3 rounded-md text-sm border"
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
            <Link
              href={`/customers/${profileId}`}
              className="text-xs hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Cancel
            </Link>
            <div className="flex flex-col items-end gap-1">
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-5 py-2.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {loading ? 'Generating package…' : 'Generate evidence package'}
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
  )
}
