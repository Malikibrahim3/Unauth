'use client';

import { useEffect, useMemo, useState } from 'react';

interface UseCountUpOptions {
  duration?: number;
  format?: (value: number) => string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useCountUp(value: number, options: UseCountUpOptions = {}) {
  const { duration = 600, format } = options;
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (!Number.isFinite(value)) {
      setDisplayValue(value);
      return;
    }

    if (prefersReducedMotion()) {
      setDisplayValue(value);
      return;
    }

    const start = performance.now();
    const shouldAnimate = Math.abs(displayValue - value) >= Math.max(1, Math.abs(value) * 0.1);
    if (!shouldAnimate) {
      setDisplayValue(value);
      return;
    }

    const from = displayValue;
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const next = from + (value - from) * eased;
      setDisplayValue(elapsed >= 1 ? value : next);
      if (elapsed < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, value]);

  return useMemo(
    () => (format ? format(displayValue) : displayValue.toLocaleString('en-GB')),
    [displayValue, format],
  );
}
