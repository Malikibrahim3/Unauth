'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { useOptionalNavigation } from './NavigationProvider';

type AppNavLinkProps = ComponentProps<typeof Link> & {
  active?: boolean;
  onNavigate?: () => void;
};

export default function AppNavLink({
  href,
  active: _active = false,
  onNavigate,
  onClick,
  className,
  children, ...props
}: AppNavLinkProps) {
  const navigation = useOptionalNavigation();
  const pendingHref = navigation?.pendingHref ?? null;
  const hrefString = typeof href === 'string' ? href : (href.pathname ?? '');
  const isPending = pendingHref !== null && pendingHref.split('?')[0] === hrefString.split('?')[0];

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      className={cn(className, isPending && 'pointer-events-none')}
      aria-busy={isPending || undefined}
      onClick={(e) => {
        onClick?.(e);
        if (
          e.defaultPrevented
          || e.button !== 0
          || e.altKey
          || e.ctrlKey
          || e.metaKey
          || e.shiftKey
          || props.download
          || props.target === '_blank'
        ) return;
        if (typeof window !== 'undefined') {
          const target = new URL(hrefString, window.location.href);
          if (target.origin !== window.location.origin) return;
          if (
            target.pathname === window.location.pathname
            && target.search === window.location.search
            && target.hash
          ) return;
          navigation?.beginNavigation(`${target.pathname}${target.search}`);
        }
        onNavigate?.();
      }}
    >
      {children}
    </Link>
  );
}
