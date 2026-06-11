import { Badge } from '@/components/ui'

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
        Identity Evidence
      </h2>
      <div className="space-y-2">
        {signals.map((signal) => (
          <div
            key={`${signal.identifierType}-${signal.maskedValue}`}
            className="flex items-center justify-between rounded-md border px-4 py-3"
            style={{
              background: 'var(--surface-sunken)',
              borderColor: 'var(--border)',
            }}
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
                <Badge tone="success" variant="subtle" size="sm">Core Signal</Badge>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-caption mt-4" style={{ color: 'var(--text-tertiary)' }}>
        Core signals are identity markers accepted under CE 3.0 rules for prior-order matching.
      </p>
    </section>
  )
}
