'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

type Props = {
  value: number;       // 0..1
  color?: string;
  track?: string;
  height?: number;
  delay?: number;
  className?: string;
  style?: CSSProperties;
};

export default function AnimatedBar({
  value,
  color = '#7B2D26',
  track = '#ECE5D4',
  height = 3,
  delay = 0,
  className = '',
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
  }, []);

  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div
      ref={ref}
      className={className}
      style={{ background: track, height: `${height}px`, position: 'relative', overflow: 'hidden', ...style }}
    >
      <div
        className={`ua-bar ${visible ? 'is-visible' : ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: `${clamped * 100}%`,
          background: color,
          ['--ua-bar-fill' as string]: '1',
          ['--ua-bar-delay' as string]: `${delay}ms`,
        } as CSSProperties}
      />
    </div>
  );
}
