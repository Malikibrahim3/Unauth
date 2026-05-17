import { FadeUp } from './LandingAnimations';

export function PullQuote() {
  return (
    <section
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(123,45,38,0.05) 0%, transparent 60%),' +
          '#F2ECE0',
        padding: '120px 0',
      }}
    >
      <div
        style={{ margin: '0 auto', maxWidth: '1080px', padding: '0 48px' }}
      >
        <FadeUp>
          <div style={{ maxWidth: '880px' }}>
            {/* Decorative open-quote mark */}
            <div
              aria-hidden
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontSize: '120px',
                color: 'rgba(123,45,38,0.12)',
                lineHeight: 0.8,
                marginBottom: '24px',
                userSelect: 'none',
              }}
            >
              &ldquo;
            </div>

            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(22px, 3.8vw, 52px)',
                lineHeight: 1.22,
                color: '#1A1814',
                letterSpacing: '-0.01em',
                marginBottom: '40px',
              }}
            >
              Your fraud rules see one customer.
              Our graph sees the{' '}
              <span style={{ color: '#7B2D26' }}>same person across seven</span>{' '}
              merchants &mdash; and the pattern only your network can resolve.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '1px',
                  background: 'linear-gradient(90deg, #7B2D26, rgba(123,45,38,0.3))',
                }}
              />
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: '#8A8472',
                  margin: 0,
                }}
              >
                FROM THE UNAUTH PRODUCT BRIEF
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
