import type { HTMLAttributes, ReactNode } from 'react';
import { Surface } from './Surface';

/**
 * A section joined inside a working surface (§8.2). Delegates to the canonical
 * {@link Surface} `joined` structure so there is one working-surface grammar.
 */
export function JoinedSection({ children, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <Surface as="section" structure="joined" {...props}>
      {children}
    </Surface>
  );
}
