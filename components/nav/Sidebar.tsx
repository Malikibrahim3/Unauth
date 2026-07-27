"use client";

import { Suspense } from "react";
import { SidebarInner, type SidebarProps } from "@/components/nav/SidebarInner";
import { UnauthLogo } from "@/components/ui/UnauthLogo";

function SidebarSkeleton({ merchantName }: Pick<SidebarProps, "merchantName">) {
  return (
    <aside className="ua-app-sidebar hidden h-full w-60 shrink-0 flex-col border-r border-[var(--ua-border-default)] md:flex" aria-label="Main navigation loading">
      <div className="border-b border-[var(--ua-border-default)] px-3 py-2">
        <UnauthLogo kind="lockup" tone="auto" height={18} alt="" decorative />
        <div className="mt-1.5 flex h-8 items-center gap-2 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2">
          <span className="h-[22px] w-[22px] rounded-[var(--ua-radius-control)] bg-[var(--ua-surface-selected)]" aria-hidden="true" />
          <span className="truncate text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-secondary)]">{merchantName ?? "Workspace"}</span>
        </div>
      </div>
      <div className="flex-1 space-y-5 p-3" aria-hidden="true">
        {[3, 5, 3].map((rows, group) => (
          <div key={group} className="space-y-2">
            <div className="h-2.5 w-16 rounded bg-[var(--ua-surface-muted)]" />
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="flex h-8 items-center gap-3 px-1">
                <div className="h-4 w-4 rounded-sm bg-[var(--ua-surface-muted)]" />
                <div className="h-3 rounded bg-[var(--ua-surface-muted)]" style={{ width: `${70 + ((row + group) % 3) * 18}px` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-[var(--ua-border-default)] p-3" aria-hidden="true">
        <div className="h-3 w-32 rounded bg-[var(--ua-surface-muted)]" />
        <div className="h-7 w-24 rounded bg-[var(--ua-surface-muted)]" />
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
