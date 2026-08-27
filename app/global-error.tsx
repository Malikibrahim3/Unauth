'use client';

/**
 * Root global error boundary. Catches errors thrown in the root layout itself,
 * where nested error.tsx boundaries cannot help, and is also what renders when a
 * nested boundary's own chunk fails to load. It must render its own
 * <html>/<body> because the root layout is what failed.
 *
 * Every value below is `var(--ua-token, #literal)`: when the authenticated
 * stylesheet did load, the real tokens win; when it did not, the literal is the
 * Signal Ledger value rather than a stale one. The body carries `ua-app` so
 * the token scope resolves whenever the stylesheet is present.
 *
 * Keep the self-contained fallbacks below in step with the active replacement
 * stylesheet so a root-layout failure still presents the same product system.
 *
 * No error message or stack is shown to the user; only the digest (a safe,
 * non-sensitive correlation id) is surfaced for support.
 */

// P08 manifest literals remain documented here while the visible fallback is
// deliberately aligned to the white-heavy Light mode palette.
// Contract history: #f4f5f1 canvas and #176b39 action.
const INK = 'var(--ua-text-primary, #111318)';
const INK_SECONDARY = 'var(--ua-text-secondary, #454b55)';
const INK_TERTIARY = 'var(--ua-text-tertiary, #6b7280)';
const CANVAS = 'var(--ua-canvas, #f7f8fa)';
const SURFACE = 'var(--ua-surface-primary, #ffffff)';
const BORDER = 'var(--ua-border-default, #dee1e6)';
const BORDER_SUBTLE = 'var(--ua-border-subtle, #eceef1)';
const ACTION = 'var(--ua-action-primary, #181a1f)';
const ACTION_FG = 'var(--ua-action-primary-fg, #ffffff)';
const RADIUS_CONTROL = 'var(--ua-radius-control, 6px)';
const RADIUS_SURFACE = 'var(--ua-radius-surface, 8px)';
const FONT =
  'var(--ua-font-sans, "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif)';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        className="ua-app"
        style={{
          margin: 0,
          minHeight: '100vh',
          background: CANVAS,
          color: INK,
          fontFamily: FONT,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <header
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            background: SURFACE,
            borderBottom: `1px solid ${BORDER_SUBTLE}`,
          }}
        >
          {/* Native image keeps the root failure screen independent of Next's image runtime. */}
          <img
            src="/brand/unauth-r1/unauth-r1-lockup-graphite.svg"
            alt="Unauth"
            width={107}
            height={20}
            style={{ display: 'block', width: 107, height: 20 }}
          />
          <span style={{ color: INK_TERTIARY, fontSize: 11, fontWeight: 500 }}>System status</span>
        </header>
        <main data-surface-id="root-global-error" data-state-id="root-global-error" style={{ maxWidth: 1500, margin: '0 auto', padding: 20 }}>
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: 620, fontSize: 13, lineHeight: '18px', color: INK_SECONDARY, margin: '0 0 16px' }}>
            The app could not finish loading this page. Your last submitted action may need confirmation after recovery; this screen does not infer that it succeeded or failed.
          </p>
          <section
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              padding: 16,
              borderRadius: RADIUS_SURFACE,
              border: `1px solid ${BORDER}`,
              background: SURFACE,
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  background: ACTION,
                  color: ACTION_FG,
                  border: `1px solid ${ACTION}`,
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '0 16px',
                  borderRadius: RADIUS_CONTROL,
                  fontFamily: 'inherit',
                }}
              >
                Try again
              </button>
              <a
                href="/overview"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  background: SURFACE,
                  color: INK,
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '0 16px',
                  borderRadius: RADIUS_CONTROL,
                  border: `1px solid ${BORDER}`,
                }}
              >
                Go to Overview
              </a>
              <a
                href="/landing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  color: INK_SECONDARY,
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '0 10px',
                }}
              >
                Product overview
              </a>
              <a
                href="mailto:support@unauth.app"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  color: INK_SECONDARY,
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '0 10px',
                }}
              >
                Contact support
              </a>
            </div>
            {error?.digest ? (
              <p
                style={{
                  fontSize: 12,
                  color: INK_TERTIARY,
                  margin: 0,
                  fontFamily: 'var(--ua-font-mono, ui-monospace, "Roboto Mono", Consolas, monospace)',
                }}
              >
                Reference: {error.digest}
              </p>
            ) : null}
          </section>
        </main>
      </body>
    </html>
  );
}
