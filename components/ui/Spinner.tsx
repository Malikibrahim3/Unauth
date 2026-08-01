'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { DELAY } from '@/lib/design/motion';

const SIZE_CLASS = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

export type SpinnerSize = keyof typeof SIZE_CLASS;

interface SpinnerProps {
  size?: SpinnerSize;
  /** Accessible label for the busy region. Not visually rendered. */
  label?: string;
  /**
   * §7.1 `DELAY.pendingIndicator`: a spinner earns its place only once real
   * work has been visible this long — a genuinely fast action never flashes
   * one. Pass `0` for a spinner whose caller already gated the delay itself
   * (e.g. only rendering this component once real work is confirmed active).
   */
  delayMs?: number;
  className?: string;
}

/**
 * §7.6's one canonical spinner. Every other rotating-glyph call site
 * (`animate-spin` on a bare icon, each with its own ad hoc markup) should
 * render this instead, so the display threshold, accessible name, and
 * reduced-motion behavior live in one place.
 */
export function Spinner({ size = 'md', label = 'Loading', delayMs = DELAY.pendingIndicator, className }: SpinnerProps) {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) {
    // The busy state is already true; only the visual affordance is delayed.
    return <span role="status" aria-live="polite" className="sr-only">{label}</span>;
  }

  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin', SIZE_CLASS[size])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
