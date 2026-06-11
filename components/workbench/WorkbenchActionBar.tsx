import { PAGE_SHELL_INNER_CLASS, PAGE_TOOLBAR_STYLE } from '@/components/ui/pageShellStyles';
import { type ReactNode } from 'react';

interface WorkbenchActionBarProps {
  left?: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
}

export function WorkbenchActionBar({ left, middle, right }: WorkbenchActionBarProps) {
  return (
    <div
      className={`${PAGE_SHELL_INNER_CLASS} grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center`}
      style={PAGE_TOOLBAR_STYLE}
    >
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 md:pb-0">{left}</div>
      <div className="flex min-w-0 items-center gap-2">{middle}</div>
      <div className="flex min-w-0 items-center gap-2">{right}</div>
    </div>
  );
}
