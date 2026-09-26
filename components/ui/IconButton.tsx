'use client';

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import type { ButtonSize } from './Button';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  size?: ButtonSize;
}

const sizes: Record<ButtonSize, CSSProperties> = { sm: { width: 28, height: 28 }, md: { width: 32, height: 32 }, lg: { width: 36, height: 36 } };

export function IconButton({ label, icon, size = 'md', className: _className, title, style, ...props }: IconButtonProps) {
  return <button type="button" aria-label={label} title={title} style={{ ...sizes[size], appearance: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: '1px solid #d8d4cf', borderRadius: 8, background: '#fff', color: '#40454a', cursor: 'pointer', ...style }} {...props}><span aria-hidden="true" style={{ display: 'inline-flex' }}>{icon}</span></button>;
}
