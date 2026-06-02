'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { useNavigation } from './NavigationProvider';

type AppNavLinkProps = ComponentProps<typeof Link> & {
  active?: boolean;
  onNavigate?: () => void;
};

export default function AppNavLink({
  href,
  active = false,
  onNavigate,
  onClick,
  className,
  children, ...props
}: AppNavLinkProps) {
  const { pendingHref, beginNavigation } = useNavigation();
  const hrefString = typeof href === 'string' ? href : (href.pathname ?? '');
  const isPending = pendingHref !== null && pendingHref.split('?')[0] === hrefString.split('?')[0];

  return (
    <Link
      href={href}
      className={cn(className, isPending && 'pointer-events-none')}
      aria-busy={isPending || undefined}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey) return;
        beginNavigation(hrefString);
        onNavigate?.();
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
