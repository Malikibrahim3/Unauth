'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Numeric plot width for Recharts. This avoids a blank first frame when a chart
 * mounts inside an animated or newly revealed dashboard surface.
 */
export function useChartWidth(fallback = 800) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return { containerRef, width };
}
