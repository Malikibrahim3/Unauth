'use client';

import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { Spinner, type SpinnerSize } from './Spinner';

export type ButtonVariant = 'primary' | 'commit' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const BUTTON_STYLE: Record<ButtonVariant, CSSProperties> = {
  primary: { background: '#1c1f23', borderColor: '#1c1f23', color: '#fff' },
  commit: { background: '#1a6b43', borderColor: '#1a6b43', color: '#fff' },
  secondary: { background: '#fff', borderColor: '#d8d4cf', color: '#40454a' },
  ghost: { background: 'transparent', borderColor: 'transparent', color: '#40454a' },
  danger: { background: '#b0431a', borderColor: '#b0431a', color: '#fff' },
  link: { background: 'transparent', borderColor: 'transparent', color: '#9f4f08' },
};
export const BUTTON_SIZE_STYLE: Record<ButtonSize, CSSProperties> = {
  sm: { height: 32, padding: '0 12px', fontSize: 12 },
  md: { height: 36, padding: '0 14px', fontSize: 12.5 },
  lg: { height: 40, padding: '0 16px', fontSize: 13 },
};
const SPINNER_SIZE: Record<ButtonSize, SpinnerSize> = { sm: 'sm', md: 'md', lg: 'lg' };

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

const base: CSSProperties = { appearance: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'solid', borderRadius: 8, fontFamily: "'Inter',sans-serif", fontWeight: 500, lineHeight: 1, textDecoration: 'none', cursor: 'pointer' };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', loading = false, leadingIcon, className: _className, children, disabled, style, ...props }, ref) {
  const inactive = Boolean(disabled || loading);
  return <button ref={ref} type="button" disabled={inactive} aria-busy={loading || undefined} style={{ ...base, ...BUTTON_STYLE[variant], ...BUTTON_SIZE_STYLE[size], opacity: inactive ? .55 : 1, cursor: inactive ? 'not-allowed' : 'pointer', ...style }} {...props}>
    {loading ? <Spinner size={SPINNER_SIZE[size]} label=""/> : leadingIcon ? <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{leadingIcon}</span> : null}
    <span>{children}</span>
  </button>;
});
