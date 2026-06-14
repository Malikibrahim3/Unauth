'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type FloatingEvidenceTone = 'neutral' | 'amber' | 'green' | 'blue' | 'rust';

const toneIconClass: Record<FloatingEvidenceTone, string> = {
  neutral: 'border-white/[0.07] bg-white/[0.055] text-white/66',
  amber: 'border-white/[0.07] bg-[rgba(245,158,11,0.12)] text-[#f0b45b]',
  green: 'border-white/[0.07] bg-[rgba(34,197,94,0.12)] text-[#67d489]',
  blue: 'border-white/[0.07] bg-[rgba(96,165,250,0.12)] text-[#8cbcff]',
  rust: 'border-white/[0.10] bg-[rgba(168,80,64,0.20)] text-[#f0b9ad]',
};

const toneDotClass: Record<FloatingEvidenceTone, string> = {
  neutral: 'bg-white/30 shadow-[0_0_8px_rgba(255,255,255,0.2)]',
  amber: 'bg-[#f0b45b]/80 shadow-[0_0_8px_rgba(240,180,91,0.35)]',
  green: 'bg-[#67d489]/80 shadow-[0_0_8px_rgba(103,212,137,0.35)]',
  blue: 'bg-[#8cbcff]/80 shadow-[0_0_8px_rgba(140,188,255,0.35)]',
  rust: 'bg-[#d88978]/90 shadow-[0_0_10px_rgba(168,80,64,0.52)]',
};

export default function FloatingEvidenceCard({
  label,
  title,
  details,
  icon,
  tone = 'neutral',
  className,
  delay = 0,
  showSignalDot = false,
}: {
  label: string;
  title: string;
  details: string[];
  icon: ReactNode;
  tone?: FloatingEvidenceTone;
  className?: string;
  delay?: number;
  showSignalDot?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      className={cn(
        'absolute min-h-[118px] rounded-xl border border-white/[0.095] bg-[#101113]/53 p-[17px]',
        'shadow-[0_28px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]',
        'backdrop-blur-xl',
        className,
      )}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {showSignalDot ? (
        <span
          className={cn(
            'absolute -left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full',
            toneDotClass[tone],
          )}
          aria-hidden
        />
      ) : null}

      <div className="flex gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
            toneIconClass[tone],
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/36">{label}</div>
          <div className="mt-2 text-[15px] font-semibold tracking-[-0.035em] text-white/[0.86]">
            {title}
          </div>
          <div className="mt-3 space-y-1">
            {details.map((detail) => (
              <div
                key={detail}
                className="text-[13px] leading-[1.35] tracking-[-0.015em] text-white/48"
              >
                {detail}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
