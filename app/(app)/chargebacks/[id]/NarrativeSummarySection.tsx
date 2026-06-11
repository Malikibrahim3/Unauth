interface NarrativeSummarySectionProps {
  narrative: string
}

export function NarrativeSummarySection({ narrative }: NarrativeSummarySectionProps) {
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
        Dispute Narrative
      </h2>
      <p
        className="text-body-md whitespace-pre-line"
        style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}
      >
        {narrative}
      </p>
    </section>
  )
}
