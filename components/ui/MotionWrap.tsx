import { type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MotionType = 'reveal' | 'hover-lift' | 'chart-draw';

interface MotionWrapProps {
  children: ReactNode;
  /**
   * Motion type — intentionally limited for product use.
   *
   * - `reveal`     : subtle fade + slide-up on viewport entry (once). Needs `ua-motion-ready` on <html>.
   * - `hover-lift` : 2px upward translate on hover (rows, cards).
   * - `chart-draw` : recharts line draw-in on mount (once).
   *
   * NOTE: `hover-glow` is intentionally excluded from the product (Binding Decision #3 — landing-only).
   * Do not add it here.
   */
  type?: MotionType;
  /** Reveal / chart-draw delay in ms — sets `--ua-reveal-delay`. */
  delay?: number;
  /** Reveal duration override in ms — sets `--ua-reveal-duration`. */
  duration?: number;
  className?: string;
}

const TYPE_CLASS: Record<MotionType, string> = {
  'reveal': 'ua-reveal',
  'hover-lift': 'ua-hover-lift',
  'chart-draw': 'ua-chart-draw',
};

/**
 * Thin wrapper that applies motion CSS classes from the product motion vocabulary.
 *
 * Motion is **restrained** in product (never theatrical). Evidence / claim artifacts get at
 * most a single quiet `reveal` + shimmer loading — no chart-draw flourish or hover-glow.
 *
 * Callers must ensure `useMotionReady()` has been called at the page / layout level so that
 * the `ua-motion-ready` class is present on `<html>` before reveal animations trigger.
 */
export function MotionWrap({
  children,
  type = 'reveal',
  delay,
  duration,
  className,
}: MotionWrapProps) {
  const baseClass = TYPE_CLASS[type];

  // reveal and chart-draw trigger immediately on mount via `is-visible`
  const triggerClass = type === 'reveal' || type === 'chart-draw' ? 'is-visible' : '';

  const style: CSSProperties = {};
  if (delay) (style as Record<string, string>)['--ua-reveal-delay'] = `${delay}ms`;
  if (duration) (style as Record<string, string>)['--ua-reveal-duration'] = `${duration}ms`;

  return (
    <div
      className={cn(baseClass, triggerClass, className)}
      style={style}
      data-motion-type={type}
    >
      {children}
    </div>
  );
}
