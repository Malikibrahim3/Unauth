"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimatedGridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: number;
  strokeWidth?: number;
  numSquares?: number;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
  className?: string;
}

export function AnimatedGridPattern({
  width = 56,
  height = 56,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  strokeWidth = 1,
  numSquares = 30,
  maxOpacity = 0.3,
  duration = 4,
  repeatDelay = 0.5,
  className,
}: AnimatedGridPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState(() => generateSquares(numSquares));

  function getPos() {
    return [
      Math.floor((Math.random() * dimensions.width) / width),
      Math.floor((Math.random() * dimensions.height) / height),
    ];
  }

  function generateSquares(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      pos: getPos(),
    }));
  }

  function updateSquarePosition(id: number) {
    setSquares((prev) =>
      prev.map((sq) => (sq.id === id ? { ...sq, pos: getPos() } : sq))
    );
  }

  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      setSquares(generateSquares(numSquares));
    }
  }, [dimensions, numSquares]);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [containerRef]);

  return (
    <svg
      ref={containerRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full fill-none stroke-current", className)}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} strokeWidth={strokeWidth} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} strokeWidth={0} />
      {squares.map(({ pos: [col, row], id: sqId }) => (
        <motion.rect
          key={`${col}-${row}-${sqId}`}
          width={width - 1}
          height={height - 1}
          x={col * width + 1}
          y={row * height + 1}
          fill="currentColor"
          strokeWidth={0}
          initial={{ opacity: 0 }}
          animate={{ opacity: maxOpacity }}
          transition={{
            duration,
            repeat: 1,
            delay: Math.random() * 2,
            repeatType: "reverse",
            ease: "easeInOut",
            repeatDelay,
          }}
          onAnimationComplete={() => updateSquarePosition(sqId)}
        />
      ))}
    </svg>
  );
}
