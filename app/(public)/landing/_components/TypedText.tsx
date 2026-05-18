'use client';

import { useEffect, useState, type CSSProperties } from 'react';

type Props = {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  style?: CSSProperties;
};

export default function TypedText({
  text,
  delay = 0,
  speed = 12,
  className = '',
  style,
}: Props) {
  const [count, setCount] = useState(text.length);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let frame = 0;
    const startedAt = window.performance.now() + delay;
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const nextCount = elapsed <= 0 ? 0 : Math.min(text.length, Math.floor(elapsed / speed) + 1);
      setCount(nextCount);
      if (nextCount < text.length) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame((now) => {
      setCount(0);
      tick(now);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [delay, speed, text]);

  const done = count >= text.length;

  return (
    <span
      className={className}
      aria-label={text}
      style={{
        display: 'inline-block',
        position: 'relative',
        whiteSpace: 'nowrap',
        verticalAlign: 'bottom',
        ...style,
      }}
    >
      <span aria-hidden style={{ visibility: 'hidden' }}>
        {text}
      </span>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {text.slice(0, count)}
        {count > 0 && !done ? <span className="ua-type-cursor" /> : null}
      </span>
    </span>
  );
}
