'use client';

import { WorkspaceSwitcher, type WorkspaceOption } from '@/components/layout/WorkspaceSwitcher';

export function WorkspaceSelectionBoundary({ workspaces }: { workspaces: WorkspaceOption[] }) {
  return (
    <main data-screen-label="Choose a workspace" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 32, background: '#ffffff', color: '#1c1f23' }}>
      <section style={{ width: '100%', maxWidth: 440, borderRadius: 11, padding: 24, background: '#ffffff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
        <div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>MERCHANT CONTEXT</div>
        <h1 style={{ margin: '12px 0 0', font: "500 20px/1.3 'Inter',sans-serif", letterSpacing: '-.012em' }}>Choose a workspace</h1>
        <p style={{ margin: '8px 0 18px', font: "400 13px/1.6 'Inter',sans-serif", color: '#64686d' }}>Your account belongs to more than one workspace. Select the merchant context to use for this session.</p>
        <WorkspaceSwitcher workspaces={workspaces} activeMerchantId={null} />
      </section>
    </main>
  );
}
