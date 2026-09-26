'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { DELAY } from '@/lib/design/motion';

const SIZE: Record<'sm' | 'md' | 'lg', number> = { sm: 14, md: 16, lg: 20 };
export type SpinnerSize = keyof typeof SIZE;

interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  delayMs?: number;
  className?: string;
  style?: CSSProperties;
}

export function Spinner({ size = 'md', label = 'Loading', delayMs = DELAY.pendingIndicator, className: _className, style }: SpinnerProps) {
  const [visible, setVisible] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return;
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);
  if (!visible) return <span role="status" aria-live="polite" className="sr-only">{label}</span>;
  const pixels = SIZE[size];
  return <span role="status" aria-live="polite" style={{ width: pixels, height: pixels, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
    <svg width={pixels} height={pixels} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><g><path d="M8 1.8a6.2 6.2 0 1 1-4.4 1.8" opacity=".28"/><path d="M3.6 3.6A6.2 6.2 0 0 1 8 1.8"/><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur=".8s" repeatCount="indefinite"/></g></svg>
    <span className="sr-only">{label}</span>
  </span>;
}
