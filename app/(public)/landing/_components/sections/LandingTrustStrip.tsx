import { Tag } from '../ui/Tag';

const SECURITY_BADGES = [
  'HMAC-SHA256 hashing',
  'k-anonymity ≥ 3',
  'Tenant-scoped salts',
  'GDPR-aware',
  'No auto-blocks',
] as const;

const METRICS = [
  { value: '38ms', label: 'avg pipeline latency' },
  { value: '100%', label: 'merchant-controlled' },
  { value: '0', label: 'auto-blocks ever issued' },
] as const;

export function LandingTrustStrip() {
  return (
    <div
      style={{
        borderTop: '1px solid var(--landing-line-faint)',
        borderBottom: '1px solid var(--landing-line-faint)',
        background: 'var(--landing-paper)',
      }}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-6 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">

        {/* Metrics */}
        <div className="flex flex-wrap gap-8">
          {METRICS.map((m) => (
            <div key={m.label}>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '22px',
                  fontWeight: 500,
                  color: 'var(--landing-ink)',
                  lineHeight: 1,
                  marginBottom: '2px',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                }}
              >
                {m.value}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '12px',
                  color: 'var(--landing-ink-tertiary)',
                  margin: 0,
                }}
              >
                {m.label}
              </p>
            </div>
          ))}
        </div>

        {/* Security badges */}
        <div className="flex flex-wrap gap-2">
          {SECURITY_BADGES.map((b) => (
            <Tag key={b} variant="neutral">{b}</Tag>
          ))}
        </div>
      </div>
    </div>
  );
}
