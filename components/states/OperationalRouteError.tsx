'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthenticatedShellPresentation } from '@/components/layout/BreadcrumbOverrideContext';
import { getPageTitleForPath } from '@/lib/navigation/appRoutes';

const ROUTE_ERROR_PRESENTATION = { kind: 'route-error' } as const;

function safeReference(digest: string | undefined) {
  if (!digest) return 'reference unavailable';
  return /^[A-Za-z0-9_-]{1,80}$/.test(digest) ? digest : 'reference unavailable';
}

function lowerFirst(value: string) {
  return value ? value[0].toLowerCase() + value.slice(1) : value;
}

export function OperationalRouteError({
  title,
  description,
  reset,
  fallbackHref = '/overview',
  digest,
  stateId,
}: {
  title: string;
  description: string;
  reset: () => void;
  fallbackHref?: string;
  digest?: string;
  stateId?: string;
}) {
  const pathname = usePathname();
  const routeLabel = getPageTitleForPath(pathname) ?? 'This page';
  const fallbackLabel = getPageTitleForPath(fallbackHref) ?? 'Overview';
  const reference = safeReference(digest);
  useAuthenticatedShellPresentation(ROUTE_ERROR_PRESENTATION);

  if (typeof window !== 'undefined' && digest) {
    console.error('[route-error]', { digest });
  }

  const retryFromKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    reset();
  };
  const copyFromKeyboard = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    void navigator.clipboard?.writeText(reference);
  };

  return (
    <div
      data-visual-source="Route-Error-Clean"
      data-visual-world="supplied-package"
      data-surface-id="route-error-boundary"
      data-state-id={stateId ?? 'route-error-boundaries'}
      style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}
    >
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#b0431a' }}/>
          <span style={{ font: "400 11px/1 'IBM Plex Mono',monospace", letterSpacing: '.09em', color: '#b0431a' }}>{routeLabel.toUpperCase()} COULD NOT LOAD</span>
        </div>
        <div style={{ font: "500 25px/1.3 'Inter',sans-serif", letterSpacing: '-.018em', color: '#1c1f23' }}>{title}</div>
        <div style={{ font: "400 13.5px/1.7 'Inter',sans-serif", color: '#64686d', marginTop: 12 }}>{description}</div>
        <div style={{ background: '#f4f3f1', borderRadius: 12, padding: '14px 16px', marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: "500 12.5px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>If it happens again, this is the reference to send us</div>
            <div style={{ font: "400 11.5px/1.6 'IBM Plex Mono',monospace", color: '#64686d', marginTop: 4 }}>{reference} · current session</div>
          </div>
          <span
            role="button"
            tabIndex={0}
            onClick={() => void navigator.clipboard?.writeText(reference)}
            onKeyDown={copyFromKeyboard}
            style={{ flex: 'none', padding: '6px 11px', borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.12)', font: "400 12px/1 'Inter',sans-serif", color: '#40454a', cursor: 'pointer' }}
          >Copy</span>
        </div>
        <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
          <div
            role="button"
            tabIndex={0}
            onClick={reset}
            onKeyDown={retryFromKeyboard}
            style={{ padding: '10px 15px', borderRadius: 9, background: '#1c1f23', color: '#ffffff', font: "500 13px/1 'Inter',sans-serif", cursor: 'pointer' }}
          >Try again</div>
          <Link href={fallbackHref} style={{ padding: '10px 15px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.13)', font: "500 13px/1 'Inter',sans-serif", color: '#40454a' }}>Go to {lowerFirst(fallbackLabel)}</Link>
          <Link href="/overview" style={{ padding: '10px 15px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.13)', font: "500 13px/1 'Inter',sans-serif", color: '#40454a' }}>Overview</Link>
        </div>
        <div style={{ font: "400 12.5px/1.7 'Inter',sans-serif", color: '#64686d', marginTop: 20, paddingTop: 16, borderTop: '1px solid #eae8e5' }}>The navigation is still here on purpose. A page failing should cost you one page, not your place in the product.</div>
      </div>
    </div>
  );
}
