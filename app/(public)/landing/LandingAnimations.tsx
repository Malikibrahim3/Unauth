'use client';

import { useRef, useEffect, useState, ReactNode } from 'react';
import { motion, useInView, useMotionValue, animate, useScroll } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

// ── FadeUp ────────────────────────────────────────────────────────────────
// Scroll-triggered fade + slide for headings and paragraphs.

interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function FadeUp({ children, delay = 0, className, style }: FadeUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

// ── HeroReveal ────────────────────────────────────────────────────────────
// Mount-time animation for the hero left column. No scroll trigger.

interface HeroRevealProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function HeroReveal({ children, className, style }: HeroRevealProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// ── HeroCard ──────────────────────────────────────────────────────────────
// Mount-time animation for the hero case file card — slides in from right.

interface HeroCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function HeroCard({ children, className, style }: HeroCardProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, x: 20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// ── AnimatedCounter ───────────────────────────────────────────────────────
// Counts up from `from` to `to` when scrolled into view.

interface AnimatedCounterProps {
  to: number;
  from?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({ to, from = 0, decimals = 0, prefix = '', suffix = '' }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(from);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [display, setDisplay] = useState(from.toFixed(decimals));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionVal, to, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        setDisplay(v.toFixed(decimals));
      },
    });
    return controls.stop;
  }, [inView, motionVal, to, decimals]);

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  );
}

// ── StaggerList ───────────────────────────────────────────────────────────
// Wrapper that staggers its children into view on scroll.

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

interface StaggerListProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function StaggerList({ children, className, style }: StaggerListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      variants={listVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  );
}

// ── StaggerItem ───────────────────────────────────────────────────────────
// Child of StaggerList. Inherits stagger timing from parent variants.

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function StaggerItem({ children, className, style }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={itemVariants}
    >
      {children}
    </motion.div>
  );
}

// ── JsonHighlight ─────────────────────────────────────────────────────────
// Token-by-token JSON syntax colouring for the API response card.

const JC = {
  key:     '#C4935A',  // warm amber keys
  str:     '#8A7A62',  // warm brown strings
  num:     '#7B2D26',  // burgundy numbers
  bool:    '#6B9E82',  // muted teal booleans
  punct:   '#6A6050',  // mid-brown punctuation
  brace:   '#4A4640',  // darker braces
};

export function JsonHighlight({ code }: { code: string }) {
  const parts: React.ReactNode[] = [];
  let src = code;
  let i = 0;

  while (src.length > 0) {
    // Key: "string"\s*:
    const keyM = src.match(/^("(?:[^"\\]|\\.)*")(\s*:)/);
    if (keyM) {
      parts.push(<span key={i++} style={{ color: JC.key }}>{keyM[1]}</span>);
      parts.push(<span key={i++} style={{ color: JC.punct }}>{keyM[2]}</span>);
      src = src.slice(keyM[0].length);
      continue;
    }
    // String value
    const strM = src.match(/^"(?:[^"\\]|\\.)*"/);
    if (strM) {
      parts.push(<span key={i++} style={{ color: JC.str }}>{strM[0]}</span>);
      src = src.slice(strM[0].length);
      continue;
    }
    // Number
    const numM = src.match(/^-?\d+\.?\d*/);
    if (numM) {
      parts.push(<span key={i++} style={{ color: JC.num, fontWeight: 600 }}>{numM[0]}</span>);
      src = src.slice(numM[0].length);
      continue;
    }
    // Boolean / null
    const boolM = src.match(/^(true|false|null)/);
    if (boolM) {
      parts.push(<span key={i++} style={{ color: JC.bool }}>{boolM[0]}</span>);
      src = src.slice(boolM[0].length);
      continue;
    }
    // Brace / bracket
    if (/^[{}\[\]]/.test(src)) {
      parts.push(<span key={i++} style={{ color: JC.brace }}>{src[0]}</span>);
      src = src.slice(1);
      continue;
    }
    // Punct
    if (/^[:,]/.test(src)) {
      parts.push(<span key={i++} style={{ color: JC.punct }}>{src[0]}</span>);
      src = src.slice(1);
      continue;
    }
    // Whitespace — preserve raw
    const wsM = src.match(/^\s+/);
    if (wsM) { parts.push(wsM[0]); src = src.slice(wsM[0].length); continue; }
    // Fallback
    parts.push(src[0]);
    src = src.slice(1);
  }

  return <>{parts}</>;
}

// ── ScrollProgress ────────────────────────────────────────────────────────────
// Fixed thin burgundy bar at top of viewport tracking scroll %.

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 100,
        background: 'linear-gradient(90deg, #7B2D26 0%, #C4935A 100%)',
        transformOrigin: '0%',
        scaleX: scrollYProgress,
      }}
    />
  );
}

// ── PaperGrain ────────────────────────────────────────────────────────────────
// Fixed SVG noise overlay for paper-like texture.

export function PaperGrain() {
  return (
    <svg
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.028,
      }}
    >
      <filter id="pg-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#pg-noise)" />
    </svg>
  );
}

// ── HeroUnderline ─────────────────────────────────────────────────────────────
// Animated hand-drawn SVG underline. Mount-triggers stroke-dashoffset draw.

export function HeroUnderline() {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <svg
      aria-hidden
      viewBox="0 0 240 14"
      style={{
        position: 'absolute',
        bottom: '-6px',
        left: '0',
        width: '100%',
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <path
        d="M2,8 C30,3 70,12 120,7 C160,2 200,11 238,6"
        fill="none"
        stroke="#7B2D26"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="260"
        strokeDashoffset={drawn ? 0 : 260}
        style={{
          transition: drawn
            ? 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)'
            : 'none',
        }}
        opacity="0.75"
      />
    </svg>
  );
}

// ── Marquee ───────────────────────────────────────────────────────────────────
// Slow-scrolling horizontal text band. Relies on @keyframes marquee in globals.css.

interface MarqueeProps {
  children: ReactNode;
  speed?: number; // seconds per loop
  style?: React.CSSProperties;
}

export function Marquee({ children, speed = 30, style }: MarqueeProps) {
  return (
    <div style={{ overflow: 'hidden', ...style }}>
      <div
        style={{
          display: 'inline-flex',
          whiteSpace: 'nowrap',
          animation: `marquee ${speed}s linear infinite`,
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}

// ── MouseLight ────────────────────────────────────────────────────────────────
// Wrapper that tracks mouse position and applies a radial spotlight effect.

interface MouseLightProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MouseLight({ children, className, style }: MouseLightProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--mx', `${x}%`);
    el.style.setProperty('--my', `${y}%`);
    el.style.background = [
      `radial-gradient(circle 180px at var(--mx) var(--my), rgba(196,147,90,0.10) 0%, transparent 60%)`,
      el.dataset.basebg ?? '#EDE8DE',
    ].join(', ');
  };

  const onMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    el.style.background = el.dataset.basebg ?? '#EDE8DE';
  };

  return (
    <div
      ref={ref}
      className={className}
      data-basebg={(style as Record<string, string> | undefined)?.background ?? '#EDE8DE'}
      style={style}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}
