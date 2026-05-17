'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

type Props = {
  value: number;       // 0..1
  color?: string;
  track?: string;
  height?: number;
  delay?: number;
  duration?: number;
  initialVisible?: boolean;
  transitionWidth?: boolean;
  className?: string;
  style?: CSSProperties;
};

export default function AnimatedBar({
  value,
  color = '#7B2D26',
  track = '#ECE5D4',
  height = 3,
  delay = 0,
  duration = 720,
  initialVisible = false,
  transitionWidth = false,
  className = '',
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(initialVisible);
  const [animatedValue, setAnimatedValue] = useState(transitionWidth ? 0 : Math.max(0, Math.min(1, value)));

  const clamped = Math.max(0, Math.min(1, value));

  useEffect(() => {
    if (!transitionWidth) return;
    setAnimatedValue(0);
    let frame = 0;
    const startedAt = window.performance.now() + delay;
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.max(0, Math.min(1, elapsed / duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(clamped * eased);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [clamped, delay, duration, transitionWidth]);

  useEffect(() => {
    if (transitionWidth) {
      setVisible(true);
      return;
    }
    if (initialVisible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }),
      { threshold: 0.5, rootMargin: '0px 0px -10% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [initialVisible, transitionWidth]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ background: track, height: `${height}px`, position: 'relative', overflow: 'hidden', ...style }}
    >
      <div
        className={transitionWidth ? '' : `ua-bar ${visible ? 'is-visible' : ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: `${(transitionWidth ? animatedValue : clamped) * 100}%`,
          background: color,
          ['--ua-bar-fill' as string]: '1',
          ['--ua-bar-width' as string]: `${clamped * 100}%`,
          ['--ua-bar-delay' as string]: `${delay}ms`,
          ['--ua-bar-duration' as string]: `${duration}ms`,
        } as CSSProperties}
      />
    </div>
  );
}
