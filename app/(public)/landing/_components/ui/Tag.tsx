import { cn } from '@/lib/utils';

type TagVariant = 'neutral' | 'status-live' | 'info';

type Props = {
  variant?: TagVariant;
  children: React.ReactNode;
  className?: string;
  showDot?: boolean;
};

export function Tag({ variant = 'neutral', children, className, showDot }: Props) {
  return (
    <span className={cn('ua-tag', `ua-tag--${variant}`, className)}>
      {showDot && <span className="ua-tag-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
