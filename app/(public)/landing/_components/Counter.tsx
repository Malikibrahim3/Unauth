'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  format?: 'comma' | 'compact' | 'plain';
  className?: string;
  delay?: number;
};

function fmt(n: number, decimals: number, mode: Props['format']) {
  if (mode === 'compact') {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(decimals)}k`;
    return n.toFixed(decimals);
  }
  if (mode === 'comma') {
    const rounded = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
    const [int, dec] = rounded.split('.');
    return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? '.' + dec : '');
  }
  return decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
}

export default function Counter({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1100,
  format = 'comma',
  className,
  delay = 0,
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState<number>(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const run = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const start = performance.now() + delay;
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const tick = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        setDisplay(value * ease(t));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === 'undefined') {
      run();
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { run(); obs.disconnect(); } }),
      { threshold: 0.4, rootMargin: '0px 0px -10% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration, delay]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{fmt(display, decimals, format)}{suffix}
    </span>
  );
}
