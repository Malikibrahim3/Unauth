import { type ReactNode } from 'react';

interface WorkbenchActionBarProps {
  left?: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
}

export function WorkbenchActionBar({ left, middle, right }: WorkbenchActionBarProps) {
  return (
    <div
      className="grid gap-3 border-b px-4 py-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-overlay)' }}
    >
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 md:pb-0">{left}</div>
      <div className="flex min-w-0 items-center gap-2">{middle}</div>
      <div className="flex min-w-0 items-center gap-2">{right}</div>
    </div>
  );
}
