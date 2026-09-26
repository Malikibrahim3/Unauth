import type { ReactNode } from 'react';

export function DecisionSentence({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, color: '#40454a', font: "400 12.5px/1.55 'Inter',sans-serif" }}>{children}</p>;
}
