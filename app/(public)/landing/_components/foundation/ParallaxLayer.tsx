'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

/**
 * Scroll-linked depth. Two primitives:
 *
 * ParallaxLayer — in-flow element that drifts against scroll while it
 * crosses the viewport. `speed` is the depth coefficient: higher = deeper
 * (more counter-drift). Negative reverses direction.
 *
 * HeroDrift — for layers inside the pinned hero. The hero itself never
 * scrolls (it is sticky under the page curtain), so its layers translate
 * and fade against absolute scroll to create depth while being covered.
 *
 * Both collapse to static wrappers under prefers-reduced-motion.
 */

export default function ParallaxLayer({
  children,
  speed = 0.2,
  className = '',
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 240, speed * -240]);

  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  );
}

export function HeroDrift({
  children,
  factor = -0.2,
  fade = true,
  scrollMax = 900,
  fadeEnd = 650,
  className = '',
}: {
  children: React.ReactNode;
  factor?: number;
  fade?: boolean;
  /** Scroll distance (px) over which the drift runs — longer keeps layers visible. */
  scrollMax?: number;
  fadeEnd?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, scrollMax], [0, scrollMax * factor]);
  const opacity = useTransform(scrollY, [0, fadeEnd], [1, fade ? 0.25 : 1]);

  return (
    <motion.div
      style={reduce ? undefined : fade ? { y, opacity } : { y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
