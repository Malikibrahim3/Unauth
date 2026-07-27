'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

export const SUPPORTED_DESKTOP_MIN_WIDTH = 1024;
const DESKTOP_QUERY = `(min-width: ${SUPPORTED_DESKTOP_MIN_WIDTH}px)`;

function subscribeToDesktopQuery(onChange: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function readDesktopQuery() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/**
 * The authenticated product has one supported layout boundary. CSS hides the
 * product subtree before hydration at unsupported widths; the media-query
 * subscription then removes it from the DOM after hydration and on resize.
 */
export function DesktopRequiredBoundary({ children }: { children: ReactNode }) {
  // Keep the server and first client render aligned. CSS hides the product
  // before this effect runs; the effect then removes it from the DOM below the
  // supported width and keeps the boundary live during resizes.
  const [isSupportedDesktop, setIsSupportedDesktop] = useState(true);

  useEffect(() => {
    const sync = () => setIsSupportedDesktop(readDesktopQuery());
    sync();
    return subscribeToDesktopQuery(sync);
  }, []);

  return (
    <div className="ua-desktop-boundary" data-desktop-supported={isSupportedDesktop ? 'true' : 'false'}>
      <div className="ua-desktop-required" role="region" aria-labelledby="ua-desktop-required-title">
        <div className="ua-desktop-required__content">
          <UnauthLogo kind="lockup" tone="auto" height={22} alt="" decorative />
          <p className="ua-desktop-required__eyebrow">Unauth workspace</p>
          <h1 id="ua-desktop-required-title">Desktop required</h1>
          <p>This workspace is designed for screens 1024px wide or larger. Resize your window to continue.</p>
        </div>
      </div>
      {isSupportedDesktop ? <div className="ua-desktop-product">{children}</div> : null}
    </div>
  );
}
