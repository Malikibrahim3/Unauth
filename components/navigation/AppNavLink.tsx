'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { Loader2 } from 'lucide-react';
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
  children,
  ...props
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
        if (e.defaultPrevented) return;
        beginNavigation(hrefString);
        onNavigate?.();
      }}
      {...props}
    >
      {children}
      {isPending && (
        <Loader2
          className="ml-auto h-3.5 w-3.5 flex-shrink-0 animate-spin text-[var(--copper-bright)]"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
