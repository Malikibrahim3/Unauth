'use client';

import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function readCaptureMode(): boolean {
  return document.documentElement.getAttribute('data-capture-mode') === 'true';
}

/**
 * §7.7's single SSR-safe motion-allowance source. Returns `false` on the
 * server and on the client's first render — before the real preference and
 * capture mode are known — then folds in `prefers-reduced-motion` and
 * `data-capture-mode`. CSS presence primitives and chart libraries read this
 * instead of querying `matchMedia` or the capture attribute independently;
 * that duplication is exactly what left three inconsistent implementations
 * before this hook existed (a non-reactive one-shot check, a reactive hook
 * with no SSR guard, and a chart-local matchMedia + MutationObserver copy).
 */
export function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const root = document.documentElement;

    const update = () => {
      setAllowed(!media.matches && !readCaptureMode());
    };

    update();
    media.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['data-capture-mode'] });

    return () => {
      media.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  return allowed;
}
