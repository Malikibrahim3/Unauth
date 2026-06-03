import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  className?: string;
};

export function Cta({ href, variant = 'primary', children, className }: Props) {
  return (
    <Link href={href} className={cn('ua-cta', `ua-cta--${variant}`, className)}>
      {children}
    </Link>
  );
}
