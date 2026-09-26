'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type WorkspaceOption = { id: string; name: string; role: string };

export function WorkspaceSwitcher({ workspaces, activeMerchantId, fallbackName }: { workspaces: WorkspaceOption[]; activeMerchantId: string | null; fallbackName?: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = fallbackName?.trim() || workspaces[0]?.name || 'Workspace';

  if (workspaces.length < 2) {
    return <small title={label} style={{ font: "400 10px/1.3 'IBM Plex Mono',monospace", color: '#64686d' }}>{label}</small>;
  }

  return (
    <label title={error ?? 'Switch active workspace'} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ font: "400 10.5px/1 'Inter',sans-serif", color: '#64686d' }}>Active workspace</span>
      <select
        value={activeMerchantId ?? ''}
        disabled={pending}
        aria-label="Active workspace"
        onChange={async (event) => {
          const nextMerchantId = event.target.value;
          setPending(true);
          setError(null);
          try {
            const response = await fetch('/api/workspace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ merchantId: nextMerchantId }) });
            if (!response.ok) {
              const body = await response.json().catch(() => ({})) as { error?: string };
              throw new Error(body.error || 'Workspace could not be changed.');
            }
            router.refresh();
          } catch (switchError) {
            setError(switchError instanceof Error ? switchError.message : 'Workspace could not be changed.');
          } finally {
            setPending(false);
          }
        }}
        style={{ width: '100%', minHeight: 38, border: 0, borderRadius: 9, padding: '0 30px 0 11px', background: '#ffffff', boxShadow: `inset 0 0 0 ${error ? '1.5px #d98b62' : '1px rgba(28,27,25,.13)'}`, color: error ? '#b0431a' : '#1c1f23', font: "400 12.5px/1 'Inter',sans-serif", outline: 0 }}
      >
        {activeMerchantId == null ? <option value="" disabled>Select a workspace…</option> : null}
        {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.role}</option>)}
      </select>
      {error ? <span role="alert" style={{ font: "400 10.5px/1.4 'Inter',sans-serif", color: '#b0431a' }}>{error}</span> : null}
    </label>
  );
}
