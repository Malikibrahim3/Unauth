'use client';

import { type ReactNode } from 'react';

/**
 * Compatibility wrapper retained for stable imports. The product now reflows
 * at narrow CSS widths, including desktop browsers at 200% zoom, instead of
 * replacing the workspace with a blocking screen.
 */
export function DesktopRequiredBoundary({ children }: { children: ReactNode }) {
  return <div className="ua-desktop-boundary"><div className="ua-desktop-product">{children}</div></div>;
}
