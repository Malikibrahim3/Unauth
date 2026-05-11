import Link from 'next/link';
import { Users, ArrowLeft } from 'lucide-react';
import TeamManagementClient from '@/components/settings/TeamManagementClient';

export default function TeamSettingsPage() {
  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          <Link href="/settings" className="hover:opacity-80 transition-colors">Settings</Link>
          <span>/</span>
          <span>Team</span>
        </div>
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" style={{ color: 'var(--icon-muted)' }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Team management</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          Invite teammates, assign owner, admin, analyst, and viewer roles, and review recent team access changes.
        </p>
      </div>

      <TeamManagementClient />

      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>
    </div>
  );
}
