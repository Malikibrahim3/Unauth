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

  const selectedOrder = orders.find(o => o.id === selectedOrderId)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Back navigation */}
      <div className="flex items-center gap-3 mb-6" style={{ color: 'var(--text-muted)' }}>
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
        This creates a document you can submit to your payment processor to defend a chargeback.
        Where your order history qualifies, the package will be formatted for Visa Compelling Evidence 3.0.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order select */}
        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: 'var(--text-muted)' }}
            htmlFor="order-select"
          >
            Order in dispute *
          </label>
          {loadingOrders ? (
            <div className="h-10 rounded-md animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
          ) : orders.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No orders found for this customer.
            </p>
          ) : (
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
              <option value="">Select an order…</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.order_id} —{' '}
                  {new Date(o.processed_at).toLocaleDateString('en-GB')}{' '}
                  {o.order_value != null ? `— ${o.order_value.toFixed(2)}` : ''}
                  {o.refund_claimed ? ' (refund claimed)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* CE3.0 pre-assessment indicator */}
        {selectedOrderId && !ce3Checking && ce3Preview !== 'unknown' && (
          <div
            className="flex items-start gap-3 p-3 rounded-lg border"
            style={{
              background: ce3Preview === 'likely' ? '#EEF2FF' : '#FEF3C7',
              borderColor: ce3Preview === 'likely' ? '#6366F1' : '#F59E0B',
            }}
          >
            <span
              className="text-lg leading-none"
              style={{ color: ce3Preview === 'likely' ? '#6366F1' : '#D97706' }}
            >
              {ce3Preview === 'likely' ? '✓' : '⚠'}
            </span>
            <p
              className="text-xs"
              style={{ color: ce3Preview === 'likely' ? '#374151' : '#92400E' }}
            >
              {ce3Preview === 'likely'
                ? 'This order appears CE3.0 eligible — a qualifying prior transaction history has been detected.'
                : 'CE3.0 eligibility requirements may not be met for this order. The package will still be valid as standard representment evidence.'}
            </p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: 'var(--text-muted)' }}
            htmlFor="notes"
          >
            Notes to include{' '}
            <span className="font-normal" style={{ color: 'var(--text-subtle)' }}>
              (optional, max 500 characters)
            </span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Any additional context for the evidence package…"
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
          <button
            type="submit"
            disabled={!selectedOrderId || loading}
            className="px-5 py-2.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            {loading ? 'Generating your evidence package and assessing CE3.0 eligibility…' : 'Generate evidence package'}
          </button>
        </div>
      </form>
    </div>
  )
}
