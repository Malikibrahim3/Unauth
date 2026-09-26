'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className: _className, style, ...props }, ref,
) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%', minWidth: 0, maxWidth: '100%' }}>
      <select ref={ref} style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, height: 36, appearance: 'none', border: '1px solid #d8d4cf', borderRadius: 8, background: props.disabled ? '#f4f3f1' : '#fff', padding: '0 32px 0 12px', color: props.disabled ? '#6f6a63' : '#1c1f23', font: "400 12px/1.4 'Inter', sans-serif", ...style }} {...props} />
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#6f6a63" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', right: 10, pointerEvents: 'none' }}><path d="m3.5 5.25 3.5 3.5 3.5-3.5" /></svg>
    </span>
  );
});
