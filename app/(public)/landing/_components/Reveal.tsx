'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
  /** Don't apply ua-reveal fade — just toggle is-visible for descendant animations. */
  noFade?: boolean;
  [key: `data-${string}`]: string | number | undefined;
};

// Set on <html> once so CSS can safely hide reveals (no-JS fallback: class never added = content always visible)
let motionReadySet = false;

export default function Reveal({
  children,
  as = 'div',
  delay = 0,
  className = '',
  style,
  once = true,
  threshold = 0.12,
  rootMargin = '0px 0px -8% 0px',
  noFade = false,
  ...dataAttributes
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  // Activate motion layer once per page (skipped if reduced-motion)
  useEffect(() => {
    if (motionReadySet) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('ua-motion-ready');
    motionReadySet = true;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once, threshold, rootMargin]);

  const Tag = as as unknown as 'div';
  const cls = `${noFade ? '' : 'ua-reveal'} ${visible ? 'is-visible' : ''} ${className}`.trim();
  const styleWithDelay: CSSProperties = {
    ...style,
    ...(delay ? ({ ['--ua-reveal-delay' as string]: `${delay}ms` } as CSSProperties) : {}),
  };

  return (
    <Tag ref={ref as never} className={cls} style={styleWithDelay} {...dataAttributes}>
      {children}
    </Tag>
  );
}
