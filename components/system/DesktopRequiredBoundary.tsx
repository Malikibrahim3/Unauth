'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { classifyDesktopSupport, safeDesktopReturnUrl, isResponsiveMarketingPath, isPublicDesktopPath, type DesktopSupportState } from '@/lib/device/desktopSupport';
import { PublicRoot, PublicNav, PublicFooter, PublicLink } from '@/components/public/PublicUI';
import publicStyles from '@/components/public/public.module.css';

const buttonStyle = {
  minHeight: 42,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 0,
  borderRadius: 10,
  padding: '0 14px',
  background: '#1c1f23',
  color: '#ffffff',
  cursor: 'pointer',
  font: "500 13px/1 'Inter',sans-serif",
  textDecoration: 'none',
} as const;

function currentSupportState(): DesktopSupportState {
  return classifyDesktopSupport({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    viewportWidth: window.innerWidth,
  });
}

function subscribeToDesktopUrl(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

function currentDesktopUrl() {
  return safeDesktopReturnUrl(window.location);
}

function DesktopRequiredScreen({ email, publicPresentation = false }: { email?: string | null; publicPresentation?: boolean }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  // Next may commit browser history after rendering the route boundary. Recheck
  // the location after commit so a handoff never retains the previous route.
  const desktopUrl = useSyncExternalStore(subscribeToDesktopUrl, currentDesktopUrl, () => '');
  const subject = encodeURIComponent('Open Unauth on a desktop');
  const body = encodeURIComponent(`Continue this Unauth task on a desktop:\n\n${desktopUrl}\n\nNo sign-in credentials are included in this link.`);
  const recipient = email?.trim() ?? '';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(desktopUrl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  if (publicPresentation) return <PublicRoot><PublicNav/><main id="public-content" className={publicStyles.state} data-desktop-required="unsupported-portable"><h1>Continue on a desktop.</h1><p>Read about Unauth here on any device. Account access and interactive workflows need a desktop, where the evidence and decision controls can stay together.</p><p className={publicStyles.fine}>Your link retains the intended destination and valid plan selection. It does not contain sign-in credentials.</p><div className={publicStyles.actions}><button className={publicStyles.button} onClick={()=>void copyLink()}>Copy desktop link</button><a className={publicStyles.button+' '+publicStyles.secondary} href={`mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`}>Email the link</a></div><p role="status" className={publicStyles.fine}>{copyState==='copied'?'Desktop link copied.':copyState==='failed'?'Copy was unavailable. Use your email app or copy the browser address.':'Email opens your own email app; Unauth does not send a message.'}</p><PublicLink href="/landing" secondary>Back to Unauth</PublicLink></main><PublicFooter/></PublicRoot>;
  return (
    <main
      data-screen-label="Desktop required"
      data-visual-source="Desktop-Required-Clean"
      data-visual-world="supplied-package"
      data-desktop-required="unsupported-portable"
      style={{ minHeight: '100dvh', boxSizing: 'border-box', display: 'grid', placeItems: 'center', overflowY: 'auto', padding: 20, background: '#efece8', color: '#1c1f23' }}
    >
      <section aria-labelledby="desktop-required-title" style={{ width: 'min(100%, 480px)', borderRadius: 16, padding: '24px 22px', background: '#ffffff', boxShadow: '0 18px 44px rgba(40,32,22,.16),0 0 0 1px rgba(28,27,25,.06)' }}>
        <div aria-hidden="true" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#1c1f23', color: '#fff', font: "500 15px/1 'IBM Plex Mono',monospace" }}>U</div>
        <h1 id="desktop-required-title" style={{ margin: '18px 0 0', font: "500 24px/1.28 'Inter',sans-serif", letterSpacing: '-.02em' }}>Open Unauth on a desktop</h1>
        <p style={{ margin: '10px 0 0', color: '#54514c', font: "400 13.5px/1.65 'Inter',sans-serif" }}>Unauth keeps case evidence, decisions and money context together. Phones and tablets do not mount a reduced workflow.</p>
        <p style={{ margin: '10px 0 0', color: '#64686d', font: "400 12px/1.55 'Inter',sans-serif" }}>Use the same browser link on a desktop at least 1024 CSS pixels wide. Nothing was submitted or changed here.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 20 }}>
          <button type="button" onClick={() => void copyLink()} style={buttonStyle}>Copy desktop link</button>
          <a href={`mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`} style={{ ...buttonStyle, background: '#f4f3f1', color: '#40454a' }}>Email the link</a>
        </div>
        <p role="status" aria-live="polite" style={{ minHeight: 18, margin: '9px 0 0', color: copyState === 'failed' ? '#b0431a' : '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{copyState === 'copied' ? 'Desktop link copied.' : copyState === 'failed' ? 'Copy was unavailable. Use Email the link instead.' : 'The copied or emailed link contains this route and safe view settings, not credentials or search text.'}</p>
      </section>
    </main>
  );
}

export function DesktopRequiredBoundary({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  const [support, setSupport] = useState<DesktopSupportState | null>(null);
  const pathname = usePathname() ?? '/';
  useEffect(() => {
    const update = () => setSupport(currentSupportState());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  if (isResponsiveMarketingPath(pathname)) return <>{children}</>;
  if (support === null) return null;
  if (support === 'unsupported-portable') return <DesktopRequiredScreen key={pathname} email={email} publicPresentation={isPublicDesktopPath(pathname)} />;
  if (support === 'narrow-desktop') {
    return <div data-narrow-desktop="true" style={{ width: '100%', minHeight: '100dvh', overflow: 'auto', background: '#efece8' }}>
      <div role="status" style={{ position: 'sticky', left: 0, top: 0, zIndex: 200, minWidth: 1024, boxSizing: 'border-box', padding: '7px 16px', background: '#fff3e9', borderBottom: '1px solid #ead8b6', color: '#7a5310', font: "500 11px/1.4 'Inter',sans-serif" }}>Narrow desktop window. Widen to 1024 CSS pixels or scroll horizontally; the full workflow remains available.</div>
      <div style={{ minWidth: 1024 }}>{children}</div>
    </div>;
  }
  return <>{children}</>;
}
