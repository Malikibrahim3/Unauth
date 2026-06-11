import { formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui'

interface PriorMatchDetailSectionProps {
  matchSignals: string[]
  matchedPriors: Array<{ orderId: string; orderDate: string; daysPriorToDispute: number }>
}

export function PriorMatchDetailSection({
  matchSignals,
  matchedPriors,
}: PriorMatchDetailSectionProps) {
  return (
    <section
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        padding: '20px 24px',
      }}
    >
      <h2
        className="text-heading-lg font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Prior Order Matches
      </h2>

      {matchSignals.length > 0 && (
        <div className="mb-5">
          <div className="text-caption font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            Matching Signals
          </div>
          <div className="flex flex-wrap gap-2">
            {matchSignals.map((signal) => (
              <Badge key={signal} tone="success" variant="subtle" size="sm">
                {signal}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {matchedPriors.length > 0 && (
        <div>
          <div className="text-caption font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            Prior Transactions
          </div>
          <div className="space-y-2">
            {matchedPriors.map((p) => (
              <div
                key={p.orderId}
                className="flex items-start justify-between rounded-md px-4 py-3"
                style={{
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    {p.orderId}
                  </div>
                  <div className="text-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(p.orderDate)} · {p.daysPriorToDispute} days before dispute
                  </div>
                </div>
                <div className="ml-4 shrink-0">
                  <Badge tone="info" variant="subtle" size="sm">+{p.daysPriorToDispute}d</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
