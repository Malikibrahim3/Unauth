import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function InsetGroup({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cn('ua-inset-group', className)} {...props}>{children}</div>;
}
