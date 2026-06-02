'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonSize, ButtonVariant } from './Button';
import { getButtonPresentation } from './buttonStyles';

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, 'className'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  leadingIcon?: React.ReactNode;
};

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  style,
  leadingIcon,
  children, ...props
}: ButtonLinkProps) {
  const { className: buttonClassName, style: buttonStyle, iconSizeClass } = getButtonPresentation(
    variant,
    size,
    className,
    style,
  );

  return (
    <Link className={buttonClassName} style={buttonStyle} {...props}>
      {leadingIcon ? (
        <span className={cn('shrink-0', iconSizeClass)} aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      {children}
    </Link>
  );
}
