import { cn } from '@/lib/utils';

type ContainerVariant = 'narrow' | 'default' | 'wide' | 'full';

interface PageContainerProps {
  variant?: ContainerVariant;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<ContainerVariant, string> = {
  /** Forms, single-purpose surfaces. max-w-[720px] */
  narrow:  'max-w-[720px]',
  /** Most pages. max-w-[1280px] */
  default: 'max-w-[1280px]',
  /** Data-dense tables. max-w-[1600px] */
  wide:    'max-w-[1600px]',
  /** Network/graph views. Full width. */
  full:    'max-w-none',
};

/**
 * PageContainer — constrains page content to the appropriate max-width
 * per §3.4 of the masterplan.
 *
 * Usage:
 *   <PageContainer variant="wide">…</PageContainer>
 */
export default function PageContainer({
  variant = 'default',
  className,
  children,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        'px-8 md:px-6 sm:px-4',
        'pt-6 pb-24',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
