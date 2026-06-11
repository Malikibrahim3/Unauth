export function EvidenceDetailCard({
  label,
  value,
  mono = false,
  valueColor,
}: {
  label: string
  value: string
  mono?: boolean
  valueColor?: string
}) {
  return (
    <div
      className="rounded-md px-4 py-3 border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}
    >
      <div className="text-caption mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div
        className={`text-body-sm font-semibold truncate ${mono ? 'font-mono' : ''}`}
        style={{ color: valueColor ?? 'var(--text)' }}
      >
        {value}
      </div>
    </div>
  )
}
