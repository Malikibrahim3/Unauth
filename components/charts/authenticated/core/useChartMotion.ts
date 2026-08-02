'use client';

import { useRef } from 'react';
import { DURATION } from '@/lib/design/motion';
import { useMotionAllowed } from '@/lib/design/useMotionAllowed';

const MAX_ANIMATED_MARKS = 40;

/** LP-MOT-06 phases: grow once on first paint, morph on a value-only update,
 * and snap (no tween) whenever the plot topology changes or motion is denied. */
export type ChartMotionPhase = 'initial' | 'update' | 'none';

export type ChartMotion = {
  phase: ChartMotionPhase;
  isAnimationActive: boolean;
  animationDuration: number;
  animationEasing: 'ease-out';
};

/**
 * Central chart-motion gate for Instrument Grade.
 *
 * Charts render settled geometry on the server. After hydration, one restrained
 * data transition is allowed when the plot is small enough and §7.7's shared
 * `useMotionAllowed` — capture mode and reduced motion — permits it.
 *
 * The transition is *topology-aware* (§6.3 / LP-MOT-06): tweening between two
 * non-comparable shapes (a different set of categories or points) animates a
 * lie, so a topology change snaps instead. Pass a `topologyKey` that changes
 * only when the category/point set changes — not when a value updates within a
 * stable set — to get the correct initial / update / none phase. The density
 * cap suppresses motion once a plot carries more than 40 marks.
 */
export function useChartMotion(
  markCount: number,
  options?: { topologyKey?: string | number },
): ChartMotion {
  const motionAllowed = useMotionAllowed();
  const withinDensityCap = markCount <= MAX_ANIMATED_MARKS;
  const topologyKey = options?.topologyKey;

  // Track the previous topology and whether the grow animation has run yet.
  // Mutating a ref during render is the documented pattern for deriving "did a
  // prop change since last render" without an effect, and keeps this SSR-safe.
  // `animatedOnce` only flips once an animation is actually permitted, so the
  // server/first-paint render (where `useMotionAllowed` is deliberately false)
  // does not burn the one-shot initial grow before hydration settles.
  const previous = useRef<{ animatedOnce: boolean; topologyKey: string | number | undefined }>({
    animatedOnce: false,
    topologyKey,
  });

  let phase: ChartMotionPhase;
  if (!previous.current.animatedOnce) {
    phase = 'initial';
  } else if (topologyKey !== previous.current.topologyKey) {
    phase = 'none';
  } else {
    phase = 'update';
  }

  const active = motionAllowed && withinDensityCap && phase !== 'none';
  previous.current = { animatedOnce: previous.current.animatedOnce || active, topologyKey };

  return {
    phase: active ? phase : 'none',
    isAnimationActive: active,
    animationDuration: DURATION.data,
    animationEasing: 'ease-out',
  };
}
