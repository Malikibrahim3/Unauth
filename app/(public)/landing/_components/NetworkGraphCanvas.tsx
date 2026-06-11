'use client';

import { useEffect, useRef } from 'react';

/**
 * The identity graph, drawn on canvas: one hashed identity in the centre,
 * five merchants around it (yours highlighted), each with its own halo of
 * order/claim records. Colors are read from the live CSS tokens at draw
 * time, the layout is deterministically seeded, and the only motion is a
 * slow signal pulse along the edge to "you" — disabled entirely under
 * prefers-reduced-motion.
 */

type Node = { x: number; y: number; r: number };
type MerchantNode = Node & { label: string; you: boolean; satellites: Node[] };

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MERCHANTS = [
  { label: 'M-204', you: false },
  { label: 'M-117', you: false },
  { label: 'M-339', you: false },
  { label: 'M-512', you: false },
  { label: 'you', you: true },
];

function buildLayout(w: number, h: number): { centre: Node; merchants: MerchantNode[] } {
  const rand = mulberry32(20260609);
  const cx = w / 2;
  const cy = h / 2;
  const ring = Math.min(w, h) * 0.34;
  const centre: Node = { x: cx, y: cy, r: 7 };

  const merchants: MerchantNode[] = MERCHANTS.map((m, i) => {
    // "you" sits at the right; others spread across the remaining arc.
    const angle = m.you ? 0 : Math.PI * 0.38 + (i / (MERCHANTS.length - 1)) * Math.PI * 1.34;
    const wobble = (rand() - 0.5) * 0.12;
    const x = cx + Math.cos(angle + wobble) * ring * (m.you ? 1.04 : 0.92 + rand() * 0.2);
    const y = cy + Math.sin(angle + wobble) * ring * (m.you ? 0.9 : 0.82 + rand() * 0.3);
    const satCount = 4 + Math.floor(rand() * 3);
    const satellites: Node[] = Array.from({ length: satCount }, () => {
      const sa = rand() * Math.PI * 2;
      const sr = 26 + rand() * 30;
      return { x: x + Math.cos(sa) * sr, y: y + Math.sin(sa) * sr * 0.8, r: 2 + rand() * 1.5 };
    });
    return { x, y, r: m.you ? 6 : 5, label: m.label, you: m.you, satellites };
  });

  return { centre, merchants };
}

export default function NetworkGraphCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const css = getComputedStyle(canvas);
    const colors = {
      ink: css.getPropertyValue('--ink-primary').trim(),
      tertiary: css.getPropertyValue('--ink-tertiary').trim(),
      border: css.getPropertyValue('--border-default').trim(),
      lime: css.getPropertyValue('--lime').trim(),
      surface: css.getPropertyValue('--surface-raised').trim(),
    };
    const monoFont = css.getPropertyValue('--font-mono').trim() || 'monospace';

    let raf = 0;
    let frame: ((t: number) => void) | null = null;

    const draw = (pulseT: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const { centre, merchants } = buildLayout(w, h);

      // Satellite edges + nodes (faintest layer)
      ctx.lineWidth = 1;
      for (const m of merchants) {
        for (const s of m.satellites) {
          ctx.strokeStyle = colors.border;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = colors.tertiary;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Identity → merchant edges
      for (const m of merchants) {
        ctx.strokeStyle = m.you ? colors.ink : colors.tertiary;
        ctx.globalAlpha = m.you ? 0.9 : 0.55;
        ctx.lineWidth = m.you ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(centre.x, centre.y);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Signal pulse travelling centre → you
      if (!reducedMotion) {
        const you = merchants.find((m) => m.you);
        if (you) {
          const t = pulseT % 1;
          const px = centre.x + (you.x - centre.x) * t;
          const py = centre.y + (you.y - centre.y) * t;
          ctx.fillStyle = colors.lime;
          ctx.globalAlpha = 1 - Math.abs(t - 0.5) * 0.8;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Merchant nodes + labels
      ctx.font = `11px ${monoFont}`;
      ctx.textAlign = 'center';
      for (const m of merchants) {
        ctx.fillStyle = colors.surface;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = m.you ? colors.lime : colors.surface;
        ctx.strokeStyle = m.you ? colors.ink : colors.tertiary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = m.you ? colors.ink : colors.tertiary;
        ctx.fillText(m.label, m.x, m.y - m.r - 8);
      }

      // Centre identity node
      ctx.fillStyle = colors.ink;
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, centre.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.lime;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, centre.r + 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = colors.ink;
      ctx.fillText('9f3b…12c8', centre.x, centre.y + centre.r + 18);
    };

    if (reducedMotion) {
      draw(0);
    } else {
      const start = performance.now();
      frame = () => {
        draw((performance.now() - start) / 2800);
        raf = requestAnimationFrame(frame as FrameRequestCallback);
      };
      raf = requestAnimationFrame(frame as FrameRequestCallback);
    }

    const ro = new ResizeObserver(() => draw(0));
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      role="img"
      aria-label="Identity graph: one hashed identity linked to claims at four merchants and your store"
    />
  );
}
