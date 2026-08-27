'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui';

export type WorkspaceOption = { id: string; name: string; role: string };

export function WorkspaceSwitcher({
  workspaces,
  activeMerchantId,
  fallbackName,
}: {
  workspaces: WorkspaceOption[];
  activeMerchantId: string | null;
  fallbackName?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (workspaces.length < 2) {
    return <small title={fallbackName?.trim() || workspaces[0]?.name || 'Workspace'}>{fallbackName?.trim() || workspaces[0]?.name || 'Workspace'}</small>;
  }

  return (
    <label className="flex min-w-0 items-center gap-2" title={error ?? 'Switch active workspace'}>
      <span className="sr-only">Active workspace</span>
      <Select
        value={activeMerchantId ?? ''}
        disabled={pending}
        aria-label="Active workspace"
        className="ua-text-dense min-w-0 max-w-full font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--uo-route-border-focus)]"
        style={{ border: '1px solid transparent', background: 'transparent', color: error ? 'var(--uo-route-risk-critical)' : undefined }}
        onChange={async (event) => {
          const nextMerchantId = event.target.value;
          setPending(true);
          setError(null);
          try {
            const response = await fetch('/api/workspace', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ merchantId: nextMerchantId }),
            });
            if (!response.ok) {
              const body = await response.json().catch(() => ({})) as { error?: string };
              throw new Error(body.error || 'Workspace could not be changed.');
            }
            router.refresh();
            setPending(false);
          } catch (switchError) {
            setError(switchError instanceof Error ? switchError.message : 'Workspace could not be changed.');
            setPending(false);
          }
        }}
      >
        {activeMerchantId == null ? <option value="" disabled>Select a workspace…</option> : null}
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.role}</option>
        ))}
      </Select>
      {error ? <span className="sr-only" role="alert">{error}</span> : null}
    </label>
  );
}
