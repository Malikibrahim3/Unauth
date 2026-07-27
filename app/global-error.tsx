'use client';

/**
 * Root global error boundary. Catches errors thrown in the root layout itself,
 * where nested error.tsx boundaries cannot help, and is also what renders when a
 * nested boundary's own chunk fails to load. It must render its own
 * <html>/<body> because the root layout is what failed.
 *
 * Every value below is `var(--ua-token, #literal)`: when the authenticated
 * stylesheet did load, the real tokens win; when it did not, the literal is the
 * Quiet Precision value rather than a stale one. The body carries `ua-app` so
 * the token scope resolves whenever the stylesheet is present.
 *
 * This file previously hardcoded the pre-Quiet-Precision palette outright — a
 * cream canvas, warm espresso ink, the retired green logo chip and a saturated
 * orange button — so the one screen a user sees when the app breaks was the one
 * screen still wearing the old design. Keep the literals below in step with
 * styles/authenticated/tokens.css.
 *
 * No error message or stack is shown to the user; only the digest (a safe,
 * non-sensitive correlation id) is surfaced for support.
 */

const INK = 'var(--ua-text-primary, #18181b)';
const INK_SECONDARY = 'var(--ua-text-secondary, #52525b)';
const INK_TERTIARY = 'var(--ua-text-tertiary, #71717a)';
const CANVAS = 'var(--ua-canvas, #f7f7f8)';
const SURFACE = 'var(--ua-surface-primary, #ffffff)';
const BORDER = 'var(--ua-border-default, #d8d8dc)';
const BORDER_SUBTLE = 'var(--ua-border-subtle, #e7e7ea)';
const ACTION = 'var(--ua-action-primary, #5b5bd6)';
const ACTION_FG = 'var(--ua-action-primary-fg, #ffffff)';
const RADIUS_CONTROL = 'var(--ua-radius-control, 6px)';
const RADIUS_SURFACE = 'var(--ua-radius-surface, 10px)';
const FONT =
  'var(--ua-font-sans, Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif)';

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/unauth-r1/unauth-r1-lockup-graphite.svg"
            alt="Unauth"
            width={107}
            height={20}
            style={{ display: 'block', width: 107, height: 20 }}
          />
          <span style={{ color: INK_TERTIARY, fontSize: 11, fontWeight: 500 }}>System status</span>
        </header>
        <main style={{ maxWidth: 1500, margin: '0 auto', padding: 20 }}>
          {/* Sentence case, no letter spacing (§3.2). */}
          <p style={{ fontSize: 11, fontWeight: 500, color: INK_TERTIARY, margin: 0 }}>We could not load this page</p>
          <h1 style={{ fontSize: 18, lineHeight: '24px', fontWeight: 600, letterSpacing: 0, margin: '4px 0' }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: 620, fontSize: 13, lineHeight: '18px', color: INK_SECONDARY, margin: '0 0 16px' }}>
            We hit an unexpected error loading the app. Your data is safe — please try again.
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
                  height: 34,
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
                href="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  background: SURFACE,
                  color: INK,
                  height: 34,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '0 16px',
                  borderRadius: RADIUS_CONTROL,
                  border: `1px solid ${BORDER}`,
                }}
              >
                Go to Overview
              </a>
            </div>
            {error?.digest ? (
              <p
                style={{
                  fontSize: 12,
                  color: INK_TERTIARY,
                  margin: 0,
                  fontFamily: 'var(--ua-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
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
