import { type ReactNode } from 'react';

interface WorkbenchActionBarProps {
  left?: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
}

export function WorkbenchActionBar({ left, middle, right }: WorkbenchActionBarProps) {
  return (
    <div
      style={{ display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
    >
      <div style={{ display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{left}</div>
      <div style={{ display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{middle}</div>
      <div style={{ display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{right}</div>
    </div>
  );
}
