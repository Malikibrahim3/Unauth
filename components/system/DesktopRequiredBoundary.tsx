'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuthenticatedTheme } from '@/components/theme/AuthenticatedThemeProvider';

export function DesktopRequiredBoundary({ children }: { children: ReactNode }) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const { theme } = useAuthenticatedTheme();

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return (
    <div className="uo-product ua-desktop-boundary" data-auth-theme={theme} data-unauth-ui="evidence-operations-v1">
      <div className="ua-desktop-required" role="status" aria-labelledby="ua-desktop-required-title">
        <div>
          <h1 id="ua-desktop-required-title">Unauth requires a desktop</h1>
          <p>Open this workspace on a screen at least 1024px wide.</p>
        </div>
      </div>
      <div className="ua-desktop-product" aria-busy={isDesktop === null || undefined}>
        {isDesktop ? children : null}
      </div>
    </div>
  );
}
