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
    <div className={cn('ua-registry-toolbar', className)} role="group" aria-label={label}>
      {search ? <div className="ua-registry-toolbar__search" data-registry-slot="search">{search}</div> : null}
      {scope ? <div className="ua-registry-toolbar__scope" data-registry-slot="scope">{scope}</div> : null}
      {filters ? <div className="ua-registry-toolbar__filters" data-registry-slot="filters">{filters}</div> : null}
      {viewControls ? <div className="ua-registry-toolbar__views" data-registry-slot="view">{viewControls}</div> : null}
      {actions ? <div className="ua-registry-toolbar__actions" data-registry-slot="actions">{actions}</div> : null}
    </div>
  );
}
