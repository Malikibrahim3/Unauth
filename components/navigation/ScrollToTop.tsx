'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

const APP_SCROLL_CONTAINER_ID = 'app-scroll-container';

export default function ScrollToTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const container = document.getElementById(APP_SCROLL_CONTAINER_ID);

    if (container) {
      container.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
