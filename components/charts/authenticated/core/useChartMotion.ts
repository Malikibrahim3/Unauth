'use client';

import { useRef } from 'react';
import { DURATION } from '@/lib/design/motion';
import { useMotionAllowed } from '@/lib/design/useMotionAllowed';

const MAX_ANIMATED_MARKS = 40;

/** Charts never animate on first paint. Only stable-topology value updates may tween. */
export type ChartMotionPhase = 'update' | 'none';

export type ChartMotion = {
  phase: ChartMotionPhase;
  isAnimationActive: boolean;
  animationDuration: number;
  animationEasing: 'ease-out';
};

/**
 * Central chart-motion gate for Instrument Grade.
 *
 * Charts render settled geometry on the server and on hydration. A restrained
 * data transition is allowed only when an explicit value key changes, the plot
 * is small enough, and §7.7's shared `useMotionAllowed` permits it.
 *
 * The transition is *topology-aware* (§6.3 / LP-MOT-06): tweening between two
 * non-comparable shapes (a different set of categories or points) animates a
 * lie, so a topology change snaps instead. Pass a `topologyKey` that changes
 * only when the category/point set changes. Pass a `valueKey` derived from the
 * plotted values; omitting it intentionally disables chart animation. The
 * density cap suppresses motion once a plot carries more than 40 marks.
 */
export function useChartMotion(
  markCount: number,
  options?: { topologyKey?: string | number; valueKey?: string | number },
): ChartMotion {
  const motionAllowed = useMotionAllowed();
  const withinDensityCap = markCount <= MAX_ANIMATED_MARKS;
  const topologyKey = options?.topologyKey;
  const valueKey = options?.valueKey;

  const previous = useRef<{
    topologyKey: string | number | undefined;
    valueKey: string | number | undefined;
  }>({
    topologyKey,
    valueKey,
  });

  const topologyStable = topologyKey === previous.current.topologyKey;
  const valuesChanged = valueKey !== undefined && valueKey !== previous.current.valueKey;
  const phase: ChartMotionPhase = topologyStable && valuesChanged ? 'update' : 'none';

  const active = motionAllowed && withinDensityCap && phase !== 'none';
  previous.current = { topologyKey, valueKey };

  return {
    phase: active ? phase : 'none',
    isAnimationActive: active,
    animationDuration: DURATION.base,
    animationEasing: 'ease-out',
  };
}
