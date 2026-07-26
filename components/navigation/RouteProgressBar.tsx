'use client';

import { cn } from '@/lib/utils';

export default function RouteProgressBar({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-150',
        active ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden="true"
    >
      <div
        className="h-full w-1/3 animate-[nav-progress_1.2s_ease-in-out_infinite]"
        style={{ background: 'var(--ua-action-primary)' }}
      />
    </div>
  );
}
