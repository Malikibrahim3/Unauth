"use client";

import { cn } from "@/lib/utils";

interface SpotlightProps {
  /** Tailwind classes for position/size override. Defaults to full-inset. */
  className?: string;
  /** CSS color string for the spotlight centre. Defaults to brand burgundy at low opacity. */
  fill?: string;
  /** 0–1 opacity of the outer element. Defaults to 1 (use fill alpha for intensity). */
  opacity?: number;
}

export function Spotlight({
  className,
  fill = "rgba(123,45,38,0.22)",
  opacity = 1,
}: SpotlightProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ opacity }}
    >
      <div
        className="absolute"
        style={{
          inset: "-20% -10% auto auto",
          width: "min(70vw, 900px)",
          height: "min(70vw, 900px)",
          background: `radial-gradient(ellipse 55% 55% at 60% 40%, ${fill}, transparent)`,
          filter: "blur(48px)",
        }}
      />
    </div>
  );
}
