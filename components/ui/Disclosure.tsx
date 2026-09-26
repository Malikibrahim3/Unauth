'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className: _className,
  summaryClassName: _summaryClassName,
  style,
  summaryStyle,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
  style?: CSSProperties;
  summaryStyle?: CSSProperties;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={style}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ display: 'flex', width: '100%', cursor: 'pointer', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: 0, padding: 0, background: 'transparent', textAlign: 'left', ...summaryStyle }}
      >
        <span>{summary}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 120ms ease' }}><path d="m3.5 5.25 3.5 3.5 3.5-3.5" /></svg>
      </button>
      {open ? children : null}
    </div>
  );
}
