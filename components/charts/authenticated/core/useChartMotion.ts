'use client';

import { useEffect, useState } from 'react';
import { DURATION } from '@/lib/design/motion';

const MAX_ANIMATED_MARKS = 40;

/**
 * Central chart-motion gate for Living Precision.
 *
 * Charts render settled geometry on the server. After hydration, one restrained
 * data transition is allowed when the plot is small enough, capture mode is off,
 * and the user has not requested reduced motion.
 */
export function useChartMotion(markCount: number) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = document.documentElement;
    const update = () => {
      const captureMode = root.getAttribute('data-capture-mode') === 'true';
      setEnabled(markCount <= MAX_ANIMATED_MARKS && !media.matches && !captureMode);
    };

    update();
    media.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['data-capture-mode'] });
    return () => {
      media.removeEventListener('change', update);
      observer.disconnect();
    };
  }, [markCount]);

  return {
    isAnimationActive: enabled,
    animationDuration: DURATION.data,
    animationEasing: 'ease-out' as const,
  };
}
