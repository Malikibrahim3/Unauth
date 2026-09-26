import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function RegistryToolbar({
  search,
  filters,
  viewControls,
  actions,
  scope,
  className,
  label = 'Registry controls',
}: {
  search?: ReactNode;
  filters?: ReactNode;
  viewControls?: ReactNode;
  actions?: ReactNode;
  /** Current workspace, saved view, or other registry scope that survives filtering. */
  scope?: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)} role="group" aria-label={label}>
      {search ? <div className="flex items-center gap-3" data-registry-slot="search">{search}</div> : null}
      {scope ? <div className="flex items-center gap-3" data-registry-slot="scope">{scope}</div> : null}
      {filters ? <div className="flex items-center gap-3" data-registry-slot="filters">{filters}</div> : null}
      {viewControls ? <div className="flex items-center gap-3" data-registry-slot="view">{viewControls}</div> : null}
      {actions ? <div className="flex items-center gap-3" data-registry-slot="actions">{actions}</div> : null}
    </div>
  );
}
