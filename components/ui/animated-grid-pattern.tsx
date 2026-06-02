"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { LazyMotion, domAnimation, m } from "motion/react";
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

type GridSquare = {
  id: number;
  pos: [number, number];
  delay: number;
};

function subscribeClientOnly() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function buildSquares(
  count: number,
  gridWidth: number,
  gridHeight: number,
  cellWidth: number,
  cellHeight: number,
  seed: number,
): GridSquare[] {
  const random = (index: number) => {
    const value = Math.sin(seed * 997 + index * 131) * 10000;
    return value - Math.floor(value);
  };

  return Array.from({ length: count }, (_, id) => ({
    id,
    pos: [
      Math.floor((random(id) * gridWidth) / cellWidth),
      Math.floor((random(id + 1) * gridHeight) / cellHeight),
    ],
    delay: random(id + 2) * 2,
  }));
}

function subscribeElementSize(node: SVGSVGElement | null, onStoreChange: () => void) {
  if (!node) return () => {};
  const observer = new ResizeObserver(onStoreChange);
  observer.observe(node);
  return () => observer.disconnect();
}

function getElementSizeSnapshot(node: SVGSVGElement | null) {
  if (!node) return { width: 0, height: 0 };
  const rect = node.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
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
  const [containerNode, setContainerNode] = useState<SVGSVGElement | null>(null);
  const mounted = useSyncExternalStore(subscribeClientOnly, getClientSnapshot, getServerSnapshot);
  const dimensions = useSyncExternalStore(
    (onStoreChange) => subscribeElementSize(containerNode, onStoreChange),
    () => getElementSizeSnapshot(containerNode),
    () => ({ width: 0, height: 0 }),
  );
  const [squareRevision, setSquareRevision] = useState(0);

  const squares = useMemo(() => {
    if (!mounted || !dimensions.width || !dimensions.height) return [];
    return buildSquares(
      numSquares,
      dimensions.width,
      dimensions.height,
      width,
      height,
      squareRevision,
    );
  }, [mounted, dimensions.width, dimensions.height, numSquares, width, height, squareRevision]);

  const updateSquarePosition = () => {
    setSquareRevision((revision) => revision + 1);
  };

  return (
    <LazyMotion features={domAnimation}>
      <svg
        ref={setContainerNode}
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 h-full w-full fill-none stroke-current", className)}
      >
        <defs>
          <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
            <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} strokeWidth={strokeWidth} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} strokeWidth={0} />
        {squares.map(({ pos: [col, row], id: sqId, delay }) => (
          <m.rect
            key={`${col}-${row}-${sqId}-${squareRevision}`}
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
              delay,
              repeatType: "reverse",
              ease: "easeInOut",
              repeatDelay,
            }}
            onAnimationComplete={() => updateSquarePosition()}
          />
        ))}
      </svg>
    </LazyMotion>
  );
}
