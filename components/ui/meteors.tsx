"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MeteorsProps {
  number?: number;
  className?: string;
  color?: string;
}

export function Meteors({ number = 8, className, color = "#B85C4A" }: MeteorsProps) {
  const [meteorStyles, setMeteorStyles] = useState<Array<React.CSSProperties>>([]);

  useEffect(() => {
    const styles = Array.from({ length: number }, () => ({
      top: Math.random() * 100 + "%",
      left: Math.random() * 100 + "%",
      animationDelay: Math.random() * 6 + "s",
      animationDuration: Math.random() * 6 + 6 + "s",
    }));
    setMeteorStyles(styles);
  }, [number]);

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          className="ua-meteor absolute h-px w-[80px] rotate-[215deg] animate-[ua-meteor_linear_infinite]"
          style={{
            ...style,
            background: `linear-gradient(90deg, ${color}, transparent)`,
            boxShadow: `0 0 0 1px ${color}14`,
          }}
        />
      ))}
    </div>
  );
}
