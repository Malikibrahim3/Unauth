'use client';

import { useEffect, useState } from 'react';

/**
 * Detects motion readiness and activates the `ua-motion-ready` layer once per page.
 * Returns `true` when motion is safe to use (reduced-motion preference not active).
 *
 * Mirrors the logic in `app/(public)/landing/_components/Reveal.tsx` so product pages
 * share the same CSS animation gate without duplicating the intersection-observer setup.
 */
export function useMotionReady(): boolean {
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionReady(false);
      return;
    }

    if (!document.documentElement.classList.contains('ua-motion-ready')) {
      document.documentElement.classList.add('ua-motion-ready');
    }

    setMotionReady(true);
  }, []);

  return motionReady;
}
