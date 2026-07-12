import { formatDate } from '@/lib/utils/format'
import { PanelCard, StatusBadge } from '@/components/ui'

interface PriorMatchDetailSectionProps {
  matchSignals: string[]
  matchedPriors: Array<{ orderId: string; orderDate: string; daysPriorToDispute: number }>
}

export function PriorMatchDetailSection({
  matchSignals,
  matchedPriors,
}: PriorMatchDetailSectionProps) {
  return (
    <PanelCard as="section" variant="app" className="px-6 py-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
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
              <StatusBadge key={signal} variant="cleared">
                {signal}
              </StatusBadge>
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
              <PanelCard
                key={p.orderId}
                variant="appInset"
                className="flex items-start justify-between px-4 py-3"
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
                  <StatusBadge variant="held" dot={false}>+{p.daysPriorToDispute}d</StatusBadge>
                </div>
              </PanelCard>
            ))}
          </div>
        </div>
      )}
    </PanelCard>
  )
}
