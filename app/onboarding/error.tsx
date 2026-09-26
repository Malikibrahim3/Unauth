'use client';

import Link from 'next/link';

export default function OnboardingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main data-screen-label="Workspace setup error" data-surface-id="workspace-onboarding" data-state-id="onboarding-error" style={{ height: 860, minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#1c1f23' }}>
      <header style={{ height: 50, flex: '0 0 50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <Link href="/landing" aria-label="Unauth home" style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#1c1f23', textDecoration: 'none' }}><span style={{ width: 24, height: 24, borderRadius: 8, display: 'grid', placeItems: 'center', background: '#1c1f23' }}><svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="5.2"/><path d="M4.4 9.6 9.6 4.4"/></svg></span><span style={{ font: "500 14px/1 'Inter',sans-serif", letterSpacing: '-.01em' }}>Unauth</span></Link>
        <span style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>WORKSPACE SETUP</span>
      </header>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 32 }}>
        <section aria-labelledby="onboarding-error-title" role="alert" style={{ width: '100%', maxWidth: 520, borderRadius: 11, padding: 24, background: '#ffffff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
          <div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#b0431a' }}>SETUP UNAVAILABLE</div>
          <h1 id="onboarding-error-title" style={{ margin: '12px 0 0', font: "500 20px/1.3 'Inter',sans-serif", letterSpacing: '-.012em' }}>We could not load setup</h1>
          <p style={{ margin: '9px 0 0', font: "400 13px/1.6 'Inter',sans-serif", color: '#64686d' }}>Your saved setup progress has not changed. If you do nothing, the workspace stays at its last completed step.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}><button type="button" onClick={reset} style={{ border: 0, borderRadius: 9, padding: '9px 12px', background: '#1c1f23', color: '#ffffff', font: "500 12.5px/1 'Inter',sans-serif" }}>Try again</button><Link href="/login" style={{ color: '#9b470d', font: "400 12.5px/1 'Inter',sans-serif" }}>Sign in again</Link></div>
        </section>
      </div>
    </main>
  );
}
