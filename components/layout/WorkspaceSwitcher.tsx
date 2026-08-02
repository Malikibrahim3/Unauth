'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui';

export type WorkspaceOption = { id: string; name: string; role: string };

export function WorkspaceSwitcher({ workspaces, activeMerchantId }: { workspaces: WorkspaceOption[]; activeMerchantId: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <label className="hidden min-w-0 items-center gap-2 sm:flex">
      <span className="sr-only">Active workspace</span>
      <Select
        value={activeMerchantId ?? ''}
        disabled={pending}
        aria-label="Active workspace"
        className="ua-text-dense w-full max-w-full font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)]"
        style={{ border: '1px solid transparent', background: 'var(--ua-surface-hover)' }}
        onChange={async (event) => {
          setPending(true);
          const response = await fetch('/api/workspace', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ merchantId: event.target.value }),
          });
          if (response.ok) {
            router.refresh();
          } else {
            setPending(false);
          }
        }}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.role}</option>
        ))}
      </Select>
    </label>
  );
}
