'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './landing.module.css';

/**
 * IntersectionObserver scroll reveal. The transition itself is pure CSS
 * (landing.module.css), so prefers-reduced-motion is honoured there without
 * JS branching. If IntersectionObserver is unavailable, content shows
 * immediately.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      // No IO support: reveal via the DOM directly (no synchronous setState in effect).
      node.classList.add(styles.revealVisible);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ''} ${className}`}
      style={{ '--d': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
