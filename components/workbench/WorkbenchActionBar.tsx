import { type ReactNode } from 'react';

interface WorkbenchActionBarProps {
  left?: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
}

export function WorkbenchActionBar({ left, middle, right }: WorkbenchActionBarProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2"
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">{left}</div>
      <div className="flex min-w-0 items-center gap-2">{middle}</div>
      <div className="flex min-w-0 items-center gap-2">{right}</div>
    </div>
  );
}
