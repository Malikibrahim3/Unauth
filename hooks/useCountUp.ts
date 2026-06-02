'use client';

import { useEffect, useMemo, useReducer, useRef } from 'react';

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
  const fromRef = useRef(value);
  const [displayValue, setDisplayValue] = useReducer(
    (_current: number, next: number) => next,
    value,
  );

  useEffect(() => {
    const commit = (next: number) => {
      fromRef.current = next;
      setDisplayValue(next);
    };

    if (!Number.isFinite(value) || prefersReducedMotion()) {
      commit(value);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();
    const shouldAnimate = Math.abs(from - value) >= Math.max(1, Math.abs(value) * 0.1);
    if (!shouldAnimate) {
      commit(value);
      return;
    }

    let frame = 0;

    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const next = from + (value - from) * eased;
      const resolved = elapsed >= 1 ? value : next;
      setDisplayValue(resolved);
      if (elapsed >= 1) {
        fromRef.current = value;
      }
      if (elapsed < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, value]);

  return useMemo(
    () => (format ? format(displayValue) : displayValue.toLocaleString('en-US')),
    [displayValue, format],
  );
}
