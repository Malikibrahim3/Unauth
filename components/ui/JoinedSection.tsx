import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function JoinedSection({ className, children, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section className={cn('ua-joined-section', className)} {...props}>{children}</section>;
}
