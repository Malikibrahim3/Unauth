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
      className="rounded-lg px-4 py-3 border"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div
        className={`text-body-sm font-semibold truncate ${mono ? 'font-mono' : ''}`}
        style={{ color: valueColor ?? 'var(--text)' }}
      >
        {value}
      </div>
    </div>
  )
}
