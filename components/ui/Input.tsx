'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className: _className, style, ...props }, ref,
) {
  return <input ref={ref} style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, height: 36, border: '1px solid #d8d4cf', borderRadius: 8, background: props.disabled ? '#f4f3f1' : '#fff', padding: '0 12px', color: props.disabled ? '#6f6a63' : '#1c1f23', font: "400 12px/1.4 'Inter', sans-serif", ...style }} {...props} />;
});
