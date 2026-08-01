import type { HTMLAttributes, ReactNode } from 'react';
import { Surface } from './Surface';

/**
 * A recessed group for controls or compact facts (§8.2). Delegates to the
 * canonical {@link Surface} `inset` structure.
 */
export function InsetGroup({ children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <Surface structure="inset" {...props}>
      {children}
    </Surface>
  );
}
