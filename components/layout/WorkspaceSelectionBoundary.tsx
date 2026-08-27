'use client';

import { WorkspaceSwitcher, type WorkspaceOption } from '@/components/layout/WorkspaceSwitcher';

export function WorkspaceSelectionBoundary({ workspaces }: { workspaces: WorkspaceOption[] }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--uo-route-canvas)] p-6">
      <section className="w-full max-w-md rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] p-6 shadow-[var(--uo-route-shadow-overlay)]">
        <h1 className="ua-text-page-title">Choose a workspace</h1>
        <p className="ua-text-body mt-2 text-[var(--uo-route-text-secondary)]">
          Your account belongs to more than one workspace. Select the merchant context to use for this session.
        </p>
        <div className="mt-5">
          <WorkspaceSwitcher workspaces={workspaces} activeMerchantId={null} />
        </div>
      </section>
    </main>
  );
}
