import { type ReactNode } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';

interface WorkbenchEmptyStateProps {
  title: string;
  description: string;
  action: Exclude<ReactNode, null | undefined | boolean>;
}

/** Thin alias kept for existing call sites — the canonical implementation is
 * `EmptyState variant="compact"` (components/ui/EmptyState.tsx). */
export function WorkbenchEmptyState({ title, description, action }: WorkbenchEmptyStateProps) {
  return <EmptyState variant="compact" title={title} description={description} action={action} />;
}
