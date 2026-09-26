import Link from 'next/link';

export function LegalHeader({ currentPath: _currentPath }: { currentPath: string }) {
  return (
    <>
      <a href="#main-content" style={{ position: 'absolute', left: -9999, top: 8, zIndex: 100 }}>Skip to document</a>
      <header style={{ height: 62, flex: 'none', display: 'flex', alignItems: 'center', gap: 'clamp(14px,4vw,26px)', padding: '0 clamp(18px,4vw,40px)', borderBottom: '1px solid #eae8e5', background: '#fff' }}>
        <Link href="/landing" aria-label="Unauth home" style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#1c1f23', textDecoration: 'none' }}>
          <span aria-hidden="true" style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: 8, background: '#1c1f23', color: '#fff', font: "500 12px/1 'IBM Plex Mono',monospace" }}>∅</span>
          <span style={{ font: "500 14px/1 'Inter',sans-serif", letterSpacing: '-.01em' }}>Unauth</span>
        </Link>
        <span style={{ flex: 1 }} />
        <Link href="/pricing" style={{ color: '#40454a', font: "400 13px/1 'Inter',sans-serif", textDecoration: 'none' }}>Pricing</Link>
        <Link href="/login" style={{ color: '#40454a', font: "400 13px/1 'Inter',sans-serif", textDecoration: 'none' }}>Sign in</Link>
      </header>
    </>
  );
}
