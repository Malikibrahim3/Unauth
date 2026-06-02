'use client';

import { useEffect, useRef, useReducer, type CSSProperties } from 'react';
import { t } from '../_tokens';

type Props = {
  value: number;
  color?: string;
  track?: string;
  height?: number;
  delay?: number;
  duration?: number;
  initialVisible?: boolean;
  transitionWidth?: boolean;
  waitForVisibility?: boolean;
  className?: string;
  style?: CSSProperties;
};

type BarState = {
  visible: boolean;
  animatedValue: number;
};

type BarAction =
  | { type: 'show' }
  | { type: 'reset-animation'; value: number }
  | { type: 'set-animated'; value: number };

function barReducer(state: BarState, action: BarAction): BarState {
  switch (action.type) {
    case 'show':
      return { ...state, visible: true };
    case 'reset-animation':
      return { ...state, animatedValue: action.value };
    case 'set-animated':
      return { ...state, animatedValue: action.value };
    default:
      return state;
  }
}

export default function AnimatedBar({
  value,
  color = t.accent,
  track = t.cream2,
  height = 3,
  delay = 0,
  duration = 720,
  initialVisible = false,
  transitionWidth = false,
  waitForVisibility = false,
  className = '',
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const clamped = Math.max(0, Math.min(1, value));
  const [{ visible, animatedValue }, dispatch] = useReducer(barReducer, {
    visible: initialVisible || (transitionWidth && !waitForVisibility),
    animatedValue: transitionWidth ? 0 : clamped,
  });

  useEffect(() => {
    if (!transitionWidth) return;
    if (waitForVisibility && !visible) return;
    dispatch({ type: 'reset-animation', value: 0 });
    let frame = 0;
    const startedAt = window.performance.now() + delay;
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.max(0, Math.min(1, elapsed / duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      dispatch({ type: 'set-animated', value: clamped * eased });
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [clamped, delay, duration, transitionWidth, visible, waitForVisibility]);

  useEffect(() => {
    if (!waitForVisibility || visible) return;
    if (initialVisible) {
      dispatch({ type: 'show' });
      return;
    }
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      dispatch({ type: 'show' });
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { dispatch({ type: 'show' }); obs.disconnect(); } }),
      { threshold: 0.3, rootMargin: '0px 0px -8% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [initialVisible, visible, waitForVisibility]);

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
