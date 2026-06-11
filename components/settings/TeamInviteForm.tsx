'use client';

import { MailPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { INVITE_ROLES, type TeamRole } from '@/components/settings/teamManagementTypes';

type TeamInviteFormProps = {
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  submitting: boolean;
  canManageTeam: boolean;
  currentUserRole: TeamRole | undefined;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: Exclude<TeamRole, 'owner'>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TeamInviteForm({
  email,
  role,
  submitting,
  canManageTeam,
  currentUserRole,
  onEmailChange,
  onRoleChange,
  onSubmit,
}: TeamInviteFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border p-5 space-y-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Invite teammate</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Invite up to 50 teammates per hour with a magic-link email.
          </p>
        </div>
        <MailPlus className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--icon-muted)' }} />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <label className="space-y-1">
          <span className="block text-xs font-semibold" style={{ color: 'var(--text)' }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            disabled={!canManageTeam || submitting}
            required
            placeholder="name@company.com"
            className="w-full rounded-md px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)', outlineColor: 'var(--accent)' }}
          />
        </label>

        <label className="space-y-1">
          <span className="block text-xs font-semibold" style={{ color: 'var(--text)' }}>Role</span>
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value as Exclude<TeamRole, 'owner'>)}
            disabled={!canManageTeam || submitting}
            className="w-full rounded-md px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)', outlineColor: 'var(--accent)' }}
          >
            {INVITE_ROLES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={!canManageTeam || submitting}
          className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <MailPlus className="h-4 w-4" />
          {submitting ? 'Sending…' : 'Invite'}
        </button>
      </div>

      {!canManageTeam ? (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Your {currentUserRole ?? 'current'} role can view the team but cannot invite users or change roles.
        </p>
      ) : null}
    </form>
  );
}
