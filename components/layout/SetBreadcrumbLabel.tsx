'use client';

import { useBreadcrumbLabel } from '@/components/layout/BreadcrumbOverrideContext';

/**
 * Sets the chrome breadcrumb's current-page label from a server component.
 * Detail routes whose URL segment is an opaque UUID render this with the
 * resolved reference (e.g. the loss category and short case ref) so the header
 * never shows a truncated id. Clears itself on unmount.
 */
export function SetBreadcrumbLabel({ label }: { label: string }) {
  useBreadcrumbLabel(label);
  return null;
}
