'use client';

import Link from '@/components/navigation/AppNavLink';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { BUTTON_SIZE_STYLE, BUTTON_STYLE, type ButtonSize, type ButtonVariant } from './Button';

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, 'className'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  leadingIcon?: ReactNode;
};

const base: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'solid', borderRadius: 8, fontFamily: "'Inter',sans-serif", fontWeight: 500, lineHeight: 1, textDecoration: 'none' };

export function ButtonLink({ variant = 'primary', size = 'md', className: _className, leadingIcon, children, style, ...props }: ButtonLinkProps) {
  return <Link style={{ ...base, ...BUTTON_STYLE[variant], ...BUTTON_SIZE_STYLE[size], ...style }} {...props}>
    {leadingIcon ? <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{leadingIcon}</span> : null}
    <span>{children}</span>
  </Link>;
}
