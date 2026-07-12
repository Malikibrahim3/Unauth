'use client';

/**
 * Root global error boundary. Catches errors thrown in the root layout itself,
 * where nested error.tsx boundaries cannot help. Must render its own <html>/<body>
 * because the root layout is what failed. Self-contained inline styles only —
 * the app shell / CSS variables are not guaranteed to be available here.
 *
 * No error message or stack is shown to the user; only the digest (a safe,
 * non-sensitive correlation id) is surfaced for support.
 */
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
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf9f7',
          color: '#1a1a1a',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <main
          style={{
            maxWidth: 420,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a3b2f', margin: 0 }}>
            Unauth
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '12px 0 8px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#5c5853', margin: '0 0 24px' }}>
            We hit an unexpected error loading the app. Your data is safe — please try again.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                appearance: 'none',
                border: 'none',
                cursor: 'pointer',
                background: '#9a3b2f',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                padding: '10px 18px',
                borderRadius: 8,
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
                background: 'transparent',
                color: '#1a1a1a',
                fontSize: 14,
                fontWeight: 600,
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #e0ddd7',
              }}
            >
              Go to dashboard
            </a>
          </div>
          {error?.digest ? (
            <p style={{ fontSize: 12, color: '#9a958d', marginTop: 20, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
