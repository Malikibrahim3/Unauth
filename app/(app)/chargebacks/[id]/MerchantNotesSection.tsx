interface MerchantNotesSectionProps {
  notes: string
}

export function MerchantNotesSection({ notes }: MerchantNotesSectionProps) {
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
        Merchant Notes
      </h2>
      <p
        className="text-body-md whitespace-pre-line"
        style={{ color: 'var(--text-primary)' }}
      >
        {notes}
      </p>
    </section>
  )
}
