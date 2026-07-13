import { ArrowRight } from 'lucide-react';
import { type ReactNode, type ComponentType, type CSSProperties } from 'react';
import Link from 'next/link';
import { Card, type CardDensity, type CardVariant } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  title: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  children: ReactNode;
  href?: string;
  linkLabel?: string;
  variant?: CardVariant;
  density?: CardDensity;
  className?: string;
}

export function ModuleCard({
  title,
  icon: Icon,
  children,
  href,
  linkLabel,
  variant = 'raised',
  density = 'default',
  className,
}: ModuleCardProps) {
  return (
    <Card variant={variant} density={density} className={cn('flex flex-col overflow-hidden', className)}>
      <div
        className="flex items-center justify-between pb-[var(--space-2)] mb-[var(--space-2)]"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-selected)] text-[var(--brand-deep)]"><Icon className="h-4 w-4" /></span>
          <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</p>
        </div>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
            {linkLabel ?? 'View'} <ArrowRight size={13} aria-hidden="true" />
          </Link>
        )}
      </div>
      <div>{children}</div>
    </Card>
  );
}
