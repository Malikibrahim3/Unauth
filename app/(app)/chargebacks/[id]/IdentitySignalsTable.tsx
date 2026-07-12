import { PanelCard, StatusBadge } from '@/components/ui'

interface IdentitySignal {
  identifierType: string
  maskedValue: string
  ce3Accepted: boolean
}

interface IdentitySignalsTableProps {
  signals: IdentitySignal[]
}

export function IdentitySignalsTable({ signals }: IdentitySignalsTableProps) {
  return (
    <PanelCard as="section" variant="app" className="px-6 py-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <h2
        className="text-heading-lg font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Identity Evidence
      </h2>
      <div className="space-y-2">
        {signals.map((signal) => (
          <PanelCard
            key={`${signal.identifierType}-${signal.maskedValue}`}
            variant="appInset"
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-caption font-semibold" style={{ color: 'var(--text-primary)' }}>
                {signal.identifierType}
              </div>
              <div className="font-mono text-caption mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {signal.maskedValue}
              </div>
            </div>
            {signal.ce3Accepted && (
              <div className="ml-4 shrink-0">
                <StatusBadge variant="cleared">Core Signal</StatusBadge>
              </div>
            )}
          </PanelCard>
        ))}
      </div>
      <p className="text-caption mt-4" style={{ color: 'var(--text-tertiary)' }}>
        Core signals are identity markers accepted under CE 3.0 rules for prior-order matching.
      </p>
    </PanelCard>
  )
}
