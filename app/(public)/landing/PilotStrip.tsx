export function PilotStrip() {
  const INDUSTRIES = [
    'DTC FASHION',
    'MARKETPLACE',
    'AUDIO HARDWARE',
    'SUBSCRIPTION BEAUTY',
    'HOME GOODS',
    'SUPPLEMENTS',
  ];

  return (
    <section
      style={{
        borderTop: '1px solid rgba(216,208,189,0.7)',
        borderBottom: '1px solid rgba(216,208,189,0.7)',
        background: 'rgba(248,245,238,0.65)',
        padding: '26px 0',
      }}
    >
      <div
        style={{ margin: '0 auto', maxWidth: '1400px', padding: '0 24px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            flexWrap: 'wrap',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: '#8A8472',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              margin: 0,
            }}
          >
            IN PILOT ACROSS
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
              flexWrap: 'wrap',
              flex: 1,
            }}
          >
            {INDUSTRIES.map((name) => (
              <span
                key={name}
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '11px',
                  color: '#6A6050',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {name}
              </span>
            ))}
          </div>

          {/* Live indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                width: '7px',
                height: '7px',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: '#6B9E82',
                  animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
                  opacity: 0.5,
                }}
              />
              <span
                style={{
                  borderRadius: '50%',
                  width: '7px',
                  height: '7px',
                  background: '#6B9E82',
                  display: 'inline-block',
                }}
              />
            </span>
            <span
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '10px',
                color: '#6B9E82',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              LIVE PILOT
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
