"use client";

import { Suspense } from "react";
import { SidebarInner, type SidebarProps } from "@/components/nav/SidebarInner";
import { UnauthLogo } from "@/components/ui/UnauthLogo";

function SidebarSkeleton({ merchantName }: Pick<SidebarProps, "merchantName">) {
  return (
    <aside className="ua-app-sidebar hidden h-full w-60 shrink-0 flex-col border-r border-[var(--border)] md:flex" aria-label="Main navigation loading">
      <div className="border-b border-[var(--border)] px-3 py-2">
        <UnauthLogo variant="mono-dark" size={12} />
        <div className="mt-1.5 flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2">
          <span className="h-[22px] w-[22px] rounded-[var(--radius-sm)] bg-[var(--surface-selected)]" aria-hidden="true" />
          <span className="truncate text-[11px] font-semibold text-[var(--text-secondary)]">{merchantName ?? "Workspace"}</span>
        </div>
      </div>
      <div className="flex-1 space-y-5 p-3" aria-hidden="true">
        {[3, 5, 3].map((rows, group) => (
          <div key={group} className="space-y-2">
            <div className="h-2.5 w-16 rounded bg-[var(--surface-sunken)]" />
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="flex h-8 items-center gap-3 px-1">
                <div className="h-4 w-4 rounded-sm bg-[var(--surface-sunken)]" />
                <div className="h-3 rounded bg-[var(--surface-sunken)]" style={{ width: `${70 + ((row + group) % 3) * 18}px` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-[var(--border)] p-3" aria-hidden="true">
        <div className="h-3 w-32 rounded bg-[var(--surface-sunken)]" />
        <div className="h-7 w-24 rounded bg-[var(--surface-sunken)]" />
      </div>
    </aside>
  );
}

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense
      fallback={
        <SidebarSkeleton merchantName={props.merchantName} />
      }
    >
      <SidebarInner {...props} />
    </Suspense>
  );
}
