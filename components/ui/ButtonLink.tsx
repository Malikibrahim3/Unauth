'use client';

import Link from '@/components/navigation/AppNavLink';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BUTTON_CLASS, BUTTON_SIZE_CLASS, type ButtonSize, type ButtonVariant } from './Button';

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, 'className'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  leadingIcon?: ReactNode;
};

export function ButtonLink({ variant = 'primary', size = 'md', className, leadingIcon, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(BUTTON_CLASS[variant], BUTTON_SIZE_CLASS[size], className)} {...props}>
      {leadingIcon ? <span className="ua-button__icon" aria-hidden="true">{leadingIcon}</span> : null}
      <span>{children}</span>
    </Link>
  );
}
