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
          background: '#f7f5f0',
          color: '#181715',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <header style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#fff', borderBottom: '1px solid #e8e4dc' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 650 }}>
            <span style={{ width: 28, height: 28, display: 'inline-grid', placeItems: 'center', borderRadius: 6, background: '#345d50', color: '#fff', fontSize: 10 }}>U</span>
            Unauth
          </span>
          <span style={{ color: '#8a857c', fontSize: 10, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase' }}>System status</span>
        </header>
        <main
          style={{
            maxWidth: 1500,
            margin: '0 auto',
            padding: 20,
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a857c', margin: 0 }}>Recoverable error</p>
          <h1 style={{ fontSize: 20, lineHeight: 1.2, fontWeight: 650, letterSpacing: '-0.025em', margin: '5px 0 4px' }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: 620, fontSize: 12, lineHeight: 1.6, color: '#666159', margin: '0 0 14px' }}>
            We hit an unexpected error loading the app. Your data is safe — please try again.
          </p>
          <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: 14, borderRadius: 8, border: '1px solid #e5e1d8', background: '#fff' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                appearance: 'none',
                border: 'none',
                cursor: 'pointer',
                background: '#FF5A0A',
                color: '#fff',
                height: 32,
                fontSize: 11,
                fontWeight: 650,
                padding: '0 12px',
                borderRadius: 6,
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
                height: 30,
                fontSize: 11,
                fontWeight: 650,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #e0ddd7',
              }}
            >
              Go to dashboard
            </a>
          </div>
          {error?.digest ? (
            <p style={{ fontSize: 10, color: '#9a958d', margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          </section>
        </main>
      </body>
    </html>
  );
}
