'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { DELAY, ROUTE_PROGRESS } from '@/lib/design/motion';
import { useMotionAllowed } from '@/lib/design/useMotionAllowed';

/**
 * Instrument Grade route-feedback contract. The line:
 *
 *   1. stays hidden for navigations below 120ms;
 *   2. enters at 12%;
 *   3. eases toward 65% then 82% while the route is genuinely pending;
 *   4. reaches 100% only on actual completion;
 *   5. holds for 80ms and fades over 100ms.
 *
 * It never completes from a timeout, and it never silently disappears while a
 * navigation is still pending — RoutePendingNotice takes over at 8s.
 */
export default function RouteProgressBar({ active }: { active: boolean }) {
  const [percent, setPercent] = useState(0);
  const [visible, setVisible] = useState(false);
  const wasActive = useRef(false);

  useEffect(() => {
    const timers: number[] = [];

    if (active) {
      wasActive.current = true;
      timers.push(
        window.setTimeout(() => {
          setPercent(ROUTE_PROGRESS.enterPercent);
          setVisible(true);
        }, DELAY.routeProgress),
        window.setTimeout(() => setPercent(ROUTE_PROGRESS.firstPercent), DELAY.routeProgress + ROUTE_PROGRESS.firstAtMs),
        window.setTimeout(() => setPercent(ROUTE_PROGRESS.secondPercent), DELAY.routeProgress + ROUTE_PROGRESS.secondAtMs),
      );
    } else if (wasActive.current) {
      wasActive.current = false;
      // Completion is real, so the bar is allowed to reach 100 — then hold, fade,
      // and only reset its width once it is no longer visible.
      setPercent(100);
      timers.push(
        window.setTimeout(() => setVisible(false), ROUTE_PROGRESS.holdMs),
        window.setTimeout(() => setPercent(0), ROUTE_PROGRESS.holdMs + ROUTE_PROGRESS.fadeMs),
      );
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [active]);

  const motionAllowed = useMotionAllowed();

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden',
        'transition-opacity duration-[var(--ua-duration-fast)] ease-[var(--ua-ease-exit)]',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden="true"
    >
      <div
        className="h-full origin-left"
        style={{
          background: 'var(--ua-accent-500)',
          width: `${percent}%`,
          // Reduced motion (and capture mode) keep the state change but drop the travel.
          transition: motionAllowed
            ? `width ${ROUTE_PROGRESS.firstAtMs}ms var(--ua-ease-standard)`
            : 'none',
        }}
      />
    </div>
  );
}
